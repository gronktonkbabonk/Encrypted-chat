/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";

import { settings } from "./settings";

export function stringToUint8(text: string) {
    const encodedText = new TextEncoder().encode(text);
    return encodedText;
}

export function uint8ToString(text: Uint8Array) {
    const decodedText = new TextDecoder().decode(text);
    return decodedText;
}

export async function hash(bytes: Uint8Array<ArrayBuffer>) {
    return new Uint8Array(await crypto.subtle.digest({ name: "SHA-256" }, bytes));
}


// HERE IS THE PROBLEM
export async function getChannelKey(channel_id: string) {
    const proxyKey = settings.store.storedKeys[channel_id];
    console.log(proxyKey);
    const uint8 = new Uint8Array(proxyKey.slice(0));
    const channelKey = uint8;
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

export const cl = classNameFactory("enc-");

