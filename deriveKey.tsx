/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { stringToUint8 } from "./utils";

export async function deriveKey(password: string, saltArr?: Uint8Array) {
    const SALT_LEN = 16;
    const ITERATIONS = 400_000; // read this from an article
    const passwordArr = await (stringToUint8(password));
    const salt: Uint8Array = saltArr ?? crypto.getRandomValues(new Uint8Array(SALT_LEN));
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
    return { derived, salt };
}
