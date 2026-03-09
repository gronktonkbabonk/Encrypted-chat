/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const IV_LEN = 16;


export async function hash(bytes: Uint8Array<ArrayBuffer>) {
    return new Uint8Array(await crypto.subtle.digest({ name: "SHA-256" }, bytes));
}

export function concatArrayBuffers(...buffers: Uint8Array[]): Uint8Array {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const result = new Uint8Array(totalLength);

    let offset = 0;
    for (const buffer of buffers) {
        result.set(buffer, offset);
        offset += buffer.byteLength;
    }

    return result;
}

export function uint8ArraysEqual(a: Uint8Array, b: Uint8Array) {
    if (a === b) return true; // same reference
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }

    return true;
}

export function toBase64(bytes: Uint8Array) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
}

export function fromBase64(base64: string): Uint8Array<ArrayBuffer> | undefined {
    try {
        const binaryString = atob(base64);
        const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        return bytes;
    } catch {
        return;
    }
}
export function stringToUint8(text: string) {
    const encodedText = new TextEncoder().encode(text);
    return encodedText;
}

export async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer> | undefined) {
    const SALT_LEN = 8;
    const ITERATIONS = 400_000; // read this from an article
    const passwordArr = await (stringToUint8(password));
    if (!salt) {
        salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    }
    const key = await crypto.subtle.importKey(
        "raw",
        passwordArr,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    const derived = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            hash: "SHA-256",
            salt: salt,
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
    return { key: derived, salt: salt };
}

export async function decrypt(messageBytes: Uint8Array<ArrayBuffer>, password: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
    const key = await crypto.subtle.importKey(
        "raw",
        password,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
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

export async function encrypt(text: string, password: Uint8Array<ArrayBuffer>) {
    const messageBytes = new TextEncoder().encode(text);
    const key = await crypto.subtle.importKey(
        "raw",
        password,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );
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
