/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Heading } from "@components/Heading";
import { Margins } from "@components/margins";
import { Paragraph } from "@components/Paragraph";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Alerts, TextInput } from "@webpack/common";

import { cl } from "./encryptIcon";
import { decrypt_key, deriveKey, encrypt_key, fromBase64, hash, IV_LEN, toBase64, uint8ArraysEqual } from "./utils";


const KEY_PREFIX = "enc";

// A wrapper around localStorage providing encryption using a master password
export class EncryptedStore {
    keyPrefix: string = "";
    // We cant init in the constructor since it can't be async, so we assume a user will call the init function
    crypt_key: CryptoKey = undefined as unknown as CryptoKey;

    is_init: boolean = false;

    innerStore = // settings.store.encryptedStore;
        {};
    public isInit(): boolean {
        return this.is_init;
    }

    // Initializes the Encrypted store. Returns true if the master password was correct or if the master password hasn't been set yet.
    public async init(master_password: string, keyPrefix: string): Promise<boolean> {
        const salt_key = `${keyPrefix}-master-salt`;
        const key_hash_key = `${keyPrefix}-key-hash`;

        const salt_string = this.innerStore[salt_key];
        let known_salt;
        if (salt_string) {
            known_salt = fromBase64(salt_string);
        }

        const { key, salt } = await deriveKey(master_password, known_salt);
        this.innerStore[salt_key] = toBase64(salt);

        const plain_key = new Uint8Array(await crypto.subtle.exportKey("raw", key));
        const computed_password_hash = await hash(plain_key);
        const ref_password_hash_string = this.innerStore[key_hash_key];
        if (ref_password_hash_string) {
            const ref_password_hash = fromBase64(ref_password_hash_string);
            if (ref_password_hash) {
                if (!uint8ArraysEqual(ref_password_hash, computed_password_hash)) {
                    return false;
                }
            }
        }

        this.innerStore[key_hash_key] = toBase64(computed_password_hash);
        this.crypt_key = key;
        this.keyPrefix = keyPrefix;
        this.is_init = true;
        return true;
    }

    public async get_key(key: string): Promise<Uint8Array<ArrayBuffer> | undefined> {
        const key_iv_string = this.innerStore[`${this.keyPrefix}-${key}-iv`];
        if (!key_iv_string) {
            return;
        }
        const key_iv = fromBase64(key_iv_string);
        if (!key_iv || key_iv.length !== IV_LEN) {
            return;
        }

        const val_string = this.innerStore[`${this.keyPrefix}-${key}-val`];
        if (!val_string) {
            return;
        }
        const val = fromBase64(val_string);
        if (!val) {
            return;
        }

        return await decrypt_key(val, this.crypt_key, key_iv);
    }

    public async set_key(key: string, val: Uint8Array<ArrayBuffer>) {
        const { iv, encrypted } = await encrypt_key(val, this.crypt_key);

        this.innerStore[`${this.keyPrefix}-${key}-val`] = toBase64(new Uint8Array(encrypted));
        this.innerStore[`${this.keyPrefix}-${key}-iv`] = toBase64(iv);
    }
    public user_prompt_store(): boolean {
        if (this.isInit()) {
            return true;
        }
        openModal(props => (
            <MasterPasswordModal rootProps={props} on_confirm={(password, p) => {
                p.onClose();
                this.init(password, KEY_PREFIX).then(success => {
                    if (success) {
                        Alerts.show({
                            title: "Master password correct",
                            body: <>
                                <Divider className={Margins.bottom16} />
                                <Paragraph>
                                    You can now use cryptographic features!
                                </Paragraph>
                            </>,
                            confirmText: "Yippe!",
                        });
                    } else {
                        Alerts.show({
                            title: "Master password incorrect",
                            body: <>
                                <Divider className={Margins.bottom16} />
                                <Paragraph>
                                    The master password you entered was incorrect. Cryptographic features will be disabled until you enter the correct one.
                                </Paragraph>
                            </>,
                            confirmText: "Zamn ):",
                        });
                    }
                });
            }} />
        ));
        return false;
    }
}


export function MasterPasswordModal({ rootProps, on_confirm }: { rootProps: ModalProps; on_confirm: ((password: string, rootProps: ModalProps) => void); }) {
    let value = "";
    return (
        <ModalRoot {...rootProps} className={cl("modal-root")}>
            <ModalHeader className={cl("modal-header")}>
                <Heading tag="h1" className={cl("modal-title")}>
                    Encrypted Chat
                </Heading>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <Divider className={Margins.bottom16} />
                <Paragraph className={Margins.bottom16}>
                    The key database hasn't been unlocked yet or a master key hasn't yet been set. Please enter a master key.
                </Paragraph>
                <TextInput placeholder="Master key" onChange={v => {
                    value = v;
                }}></TextInput>
                <Button className={cl("modal-button")} onClick={() => {
                    on_confirm(value, rootProps);
                }} >
                    Confirm!
                </Button>
            </ModalContent>

        </ModalRoot>
    );
}

export const encryptedStore = new EncryptedStore();
