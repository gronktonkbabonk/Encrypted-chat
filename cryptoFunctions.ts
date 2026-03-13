/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "./settings";
import { base64ToUint8, hash, IV_LEN, stringToUint8 } from "./utils";

export const CHECKSUM_LEN = 8; // Ought to be enuf

// derives a key from a string using PBKDF2. A salt can be passed or else it is automatically generated.
export async function deriveKey(password: string, saltArr?: Uint8Array) {
    const SALT_LEN = 16;
    const ITERATIONS = 400_000; // read this from an article lmao (it suggested 310k so this should be super-duper secure)
    const passwordArr = stringToUint8(password);
    const salt: Uint8Array = saltArr ?? crypto.getRandomValues(new Uint8Array(SALT_LEN)); // generates a salt if one has not been passed
    const key = await crypto.subtle.importKey(
        "raw",
        passwordArr,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    const derivedKey = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            hash: "SHA-256",
            salt: salt as BufferSource,
            iterations: ITERATIONS
        },
        key,
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
    return { derivedKey, salt };
}

// the decrypt and encrypt functions (self explanatory). String -> uint8array -> encrypted uint8array -> base64 string and vice versa

export async function decrypt(messageBytes: Uint8Array<ArrayBuffer>, key: CryptoKey, iv: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        messageBytes
    );
    return new Uint8Array(decrypted);
}

export async function encrypt(message: string, key: CryptoKey) {
    const messageBytes = new TextEncoder().encode(message);
    const iv = await crypto.getRandomValues(new Uint8Array(IV_LEN));

    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        messageBytes
    );

    return { encrypted: encrypted, iv: iv };
}

export async function decrypt_key(messageBytes: Uint8Array<ArrayBuffer>, key: CryptoKey, iv: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        messageBytes
    );
    return new Uint8Array(decrypted);
}

export async function encrypt_key(bytes: Uint8Array<ArrayBuffer>, key: CryptoKey) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));

    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        bytes
    );

    return { encrypted: encrypted, iv: iv };
}

// gets the key for the channel the user is currently on.

export async function getChannelKey(channel_id: string) {
    const proxyKey = settings.store.storedKeys[channel_id]; // called proxyKey because settings.store returns a gawddam proxy
    const channelKey = base64ToUint8(proxyKey);
    const key = await crypto.subtle.importKey(
        "raw",
        channelKey,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    );
    console.log(key);
    return key;
}

export async function createChecksum(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
    return (await hash(bytes)).slice(0, CHECKSUM_LEN);
}
