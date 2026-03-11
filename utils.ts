/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import { getCurrentChannel } from "@utils/discord";
import { ChannelStore } from "@webpack/common/stores";

export const IV_LEN = 16;
export const cl = classNameFactory("enc-");


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

export function stringToUint8(text: string) {
    const encodedText = new TextEncoder().encode(text);
    return encodedText;
}


export function uint8ToString(text: Uint8Array) {
    const decodedText = new TextDecoder().decode(text);
    return decodedText;
}

export function uint8ToBase64(bytes: Uint8Array) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
}

export function base64ToUint8(base64: string) {
    try {
        const binaryString = atob(base64);
        const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        return bytes;
    } catch {
        return new Uint8Array;
    }
}

export async function hash(bytes: Uint8Array<ArrayBuffer>) {
    return new Uint8Array(await crypto.subtle.digest({ name: "SHA-256" }, bytes));
}

export function getCurrentChannelOrDmName() {
    return getCurrentChannel()?.name ?? ChannelStore.getDMFromUserId(ChannelStore.getDMUserIds()[0]);
}
