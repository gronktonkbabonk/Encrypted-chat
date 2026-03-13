/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Divider } from "@components/Divider";
import { Margins } from "@components/margins";
import { Paragraph } from "@components/Paragraph";
import { openModal } from "@utils/modal";
import { Alerts } from "@webpack/common";

import { decrypt_key, deriveKey, encrypt_key } from "./cryptoFunctions";
import { MasterPasswordModal } from "./modals";
import { base64ToUint8, hash, IV_LEN, KEY_PREFIX, uint8ArraysEqual, uint8ToBase64 } from "./utils";

// =======================================================================================
// I KNOW IT SAYS GRONK BUT THIS IS ALL LEAHS CODE. IT JUST BLAMES ME BECAUSE I MERGED IT.
// =======================================================================================

function MasterPasswordStatusAlert(enabled: boolean) {
    const enabledMessage = "You can now use cryptographic features!";
    const disabledMessage = "The master password you entered was incorrect. Cryptographic features will be disabled until you enter the correct one.";
    const message = (enabled) ? enabledMessage : disabledMessage;
    Alerts.show({
        title: `Master Password ${(enabled) ? "Correct" : "Incorrect"}`,
        body: <>
            <Divider className={Margins.bottom16} />
            <Paragraph>
                {message}
            </Paragraph>
        </>,
        confirmText: (enabled) ? "Yippe!" : "Zamn ):"
    });
}

// A wrapper around localStorage providing encryption using a master password
export class EncryptedStore {
    keyPrefix: string = "";
    // We cant init in the constructor since it can't be async, so we assume a user will call the init function
    master_key: CryptoKey = undefined as unknown as CryptoKey;

    is_init: boolean = false;

    innerStore = // settings.store.storedKeys;
        {};
    // we need a separate thing for locally stored things we dont wanna sync
    public isInit(): boolean {
        return this.is_init;
    }

    // Initializes the Encrypted store. Returns true if the master password was correct or if the master password hasn't been set yet.
    public async init(master_password: string, keyPrefix: string): Promise<boolean> {
        const salt_key = `${keyPrefix}-master-salt`;
        const stored_key_hash_key = `${keyPrefix}-key-hash`; // key for the key hash

        // fetches the salt
        const salt_string = this.innerStore[salt_key];
        let known_salt;
        if (salt_string) {
            known_salt = base64ToUint8(salt_string);
        }

        // derives the master key with the given master password and the salt
        const { derivedKey, salt } = await deriveKey(master_password, known_salt);
        this.innerStore[salt_key] = uint8ToBase64(salt);

        // exports the master key to a plain uint8
        const derived_key = new Uint8Array(await crypto.subtle.exportKey("raw", derivedKey));
        const derived_key_hash = await hash(derived_key); // hashes the exported key to match the check
        const stored_key_hash = this.innerStore[stored_key_hash_key];
        if (stored_key_hash) { // if a password hash is stored
            const match_stored_key_hash = base64ToUint8(stored_key_hash); // sets the hash to a uint8 to check
            if (match_stored_key_hash) { // not sure why we need this, if it's faulty somehow?
                if (!uint8ArraysEqual(match_stored_key_hash, derived_key_hash)) {
                    // matches the hashed master key that we just derived and the stored key hash
                    return false;
                }
            }
        }

        this.innerStore[stored_key_hash_key] = uint8ToBase64(derived_key_hash);
        this.master_key = derivedKey;
        this.keyPrefix = keyPrefix;
        this.is_init = true;
        return true;
    }

    public async get_key(key: string): Promise<Uint8Array<ArrayBuffer> | undefined> {
        const key_iv_string = this.innerStore[`${this.keyPrefix}-${key}-iv`];
        if (!key_iv_string) {
            return;
        }
        const key_iv = base64ToUint8(key_iv_string);
        if (!key_iv || key_iv.length !== IV_LEN) {
            return;
        }

        const val_string = this.innerStore[`${this.keyPrefix}-${key}-val`];
        if (!val_string) {
            return;
        }
        const val = base64ToUint8(val_string);
        if (!val) {
            return;
        }

        return await decrypt_key(val, this.master_key, key_iv);
    }

    public async set_key(key: string, val: Uint8Array<ArrayBuffer>) {
        const { iv, encrypted } = await encrypt_key(val, this.master_key);

        this.innerStore[`${this.keyPrefix}-${key}-val`] = uint8ToBase64(new Uint8Array(encrypted));
        this.innerStore[`${this.keyPrefix}-${key}-iv`] = uint8ToBase64(iv);
    }

    public user_prompt_store(): boolean {
        if (this.isInit()) { // this is unnecessary because this can only be called if isInit returns false
            return true;
        }
        openModal(props => (
            <MasterPasswordModal rootProps={props} on_confirm={(password, p) => {
                p.onClose();
                this.init(password, KEY_PREFIX).then(success => {
                    MasterPasswordStatusAlert(success);
                });
            }} />
        ));
        return false;
    }
}


export const encryptedStore = new EncryptedStore();
