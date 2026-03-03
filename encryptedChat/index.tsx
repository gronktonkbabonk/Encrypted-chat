/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessagePreEditListener, addMessagePreSendListener, removeMessagePreEditListener, removeMessagePreSendListener } from "@api/MessageEvents";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";

const regexStartEnd = /(?<=\|START\|)(?=.* )(.*)(?=\|END\|)/;

const password = crypto.getRandomValues(new Uint8Array(32));
let binary = "";
password.forEach(element => binary += String.fromCharCode(element));
console.log("Your password is: " + btoa(binary));

/*
 * |=============================================================================================|
 * |IMPORTANT - THIS CODE IS DOGSHIT AND NEEDS MAJOR REFACTORING DONT COME AFTER ME BECAUSE OF IT|
 * |=============================================================================================|
*/


async function encrypt(text: string, password: Uint8Array<ArrayBuffer>) {
    const messageBytes = new TextEncoder().encode(text);
    const key = await crypto.subtle.importKey(
        "raw",
        password,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );
    const iv = await crypto.getRandomValues(new Uint8Array(16));

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


async function decrypt(message: Message, password: Uint8Array<ArrayBuffer>): Promise<string> {
    const decoded = decodeMessage(message);
    const { encrypted, iv } = decoded;

    const key = await crypto.subtle.importKey(
        "raw",
        password,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        encrypted
    );
    return new TextDecoder().decode(decrypted);
}

function encodeMessage(encrypted: ArrayBuffer, iv: Uint8Array) {
    console.log(new TextDecoder().decode(encrypted));
    const encryptedArray = new Uint8Array(encrypted);
    const ivArray = iv;
    // these are both just turning the uint8array s into binary strings :)
    let encEncoded = "";
    let ivEncoded = "";
    for (let i = 0; i < encryptedArray.length; i++) {
        encEncoded += String.fromCharCode(encryptedArray[i]);
    }
    for (let i = 0; i < ivArray.length; i++) {
        ivEncoded += String.fromCharCode(ivArray[i]);
    }
    return `START|${btoa(ivEncoded)} ${btoa(encEncoded)}|END`;
}



function decodeMessage(message: Message) {
    const encodedDecon = message.content.split(" ");
    const textEncoder = new TextEncoder();
    // turning the b64 from b64 -> binary string -> uint8array
    const encrypted = textEncoder.encode(atob(encodedDecon[0]));
    const iv = textEncoder.encode(atob(encodedDecon[1]));
    return { encrypted: encrypted, iv: iv };
}


function decryptCheckAndModify(message: Message) {
    const splitMessage = message;
    let decryptedMessage: string;
    // // testing if the message meets the regex requirements. (must be between a START| and an |END and have a space in it)
    if (regexStartEnd.test(message.content)) {
        splitMessage.content = splitMessage.content.split("|")[1];
        message.content = decrypt(splitMessage, password);
    }
    return message.content;
}


export default definePlugin({
    name: "EncryptedChat",
    description: "A plugin to let you communicate with symmetric encryption in servers (TODO: asymmetric for DMS)",
    authors: [{ name: "Leah", id: 429195069015195650n }, { name: "Fern", id: 972889822857420810n }],

    decryptCheckAndModify,

    patches: [
        {
            find: "!1,hideSimpleEmbedContent",
            replacement: {
                match: /(let{toAST:.{0,125}?)\(\i\?\?\i\).content/,
                replace: "const textReplaceContent=$self.decryptCheckAndModify(arguments[2]?.contentMessage??arguments[1]);$1textReplaceContent"
            }
        }
    ],

    start() {
        this.onSent = addMessagePreSendListener(async (channelId, messageObj, extra) => {
            await encrypt(messageObj.content, password).then(encrypted => {
                messageObj.content = encodeMessage(encrypted.encrypted, encrypted.iv);
                return { cancel: false };
            });
        });

        this.onEdit = addMessagePreEditListener(async (channelId, messageId, messageObj) => {
            await encrypt(messageObj.content, password).then(encrypted => {
                messageObj.content = encodeMessage(encrypted.encrypted, encrypted.iv);
                return { cancel: false };
            });
        });
    },
    stop() {
        removeMessagePreSendListener(this.onSent);
        removeMessagePreEditListener(this.onEdit);
    }
});
