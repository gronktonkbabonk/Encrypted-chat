/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { decrypt_key, deriveKey, encrypt_key, fromBase64, hash, IV_LEN, toBase64, uint8ArraysEqual } from "./utils";

// A wrapper around localStorage providing encryption using a master password
export class EncryptedStore {
    keyPrefix: string = "";
    // We cant init in the constructor since it can't be async, so we assume a user will call the init function
    crypt_key: CryptoKey = undefined as unknown as CryptoKey;

    // Initializes the Encrypted store. Returns true if the master password was correct or if the master password hasn't been set yet.
    public async init(master_password: string, keyPrefix: string): Promise<boolean> {
        const salt_key = `${keyPrefix}-master-salt`;
        const key_hash_key = `${keyPrefix}-key-hash`;

        const salt_string = localStorage.getItem(salt_key);
        let known_salt;
        if (salt_string !== null) {
            known_salt = fromBase64(salt_string);
        }

        const { key, salt } = await deriveKey(master_password, known_salt);
        localStorage.setItem(salt_key, toBase64(salt));

        const plain_key = new Uint8Array(await crypto.subtle.exportKey("raw", key));
        const computed_password_hash = await hash(plain_key);
        const ref_password_hash_string = localStorage.getItem(key_hash_key);
        if (ref_password_hash_string !== null) {
            const ref_password_hash = fromBase64(ref_password_hash_string);
            if (ref_password_hash) {
                if (!uint8ArraysEqual(ref_password_hash, computed_password_hash)) {
                    return false;
                }
            }
        }

        localStorage.setItem(key_hash_key, toBase64(computed_password_hash));
        this.crypt_key = key;
        this.keyPrefix = keyPrefix;
        return true;
    }

    public async get_key(key: string): Promise<Uint8Array<ArrayBuffer> | undefined> {
        const key_iv_string = localStorage.getItem(`${this.keyPrefix}-${key}-iv`);
        if (key_iv_string == null) {
            return;
        }
        const key_iv = fromBase64(key_iv_string);
        if (!key_iv || key_iv.length !== IV_LEN) {
            return;
        }

        const val_string = localStorage.getItem(`${this.keyPrefix}-${key}-val`);
        if (val_string == null) {
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

        localStorage.setItem(`${this.keyPrefix}-${key}-val`, toBase64(new Uint8Array(encrypted)));
        localStorage.setItem(`${this.keyPrefix}-${key}-iv`, toBase64(iv));
    }
}


