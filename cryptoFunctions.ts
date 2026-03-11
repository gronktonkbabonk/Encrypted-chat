/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "./settings";
import { base64ToUint8, IV_LEN, stringToUint8 } from "./utils";

export async function deriveKey(password: string, saltArr?: Uint8Array) {
    const SALT_LEN = 16;
    const ITERATIONS = 400_000; // read this from an article
    const passwordArr = stringToUint8(password);
    const salt: Uint8Array = saltArr ?? crypto.getRandomValues(new Uint8Array(SALT_LEN));
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

export async function encrypt(text: string, key: CryptoKey) {
    const messageBytes = new TextEncoder().encode(text);
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

export async function getChannelKey(channel_id: string) {
    const proxyKey = settings.store.storedKeys[channel_id];
    console.log(proxyKey);
    const channelKey = base64ToUint8(proxyKey);
    console.log(channelKey);
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
