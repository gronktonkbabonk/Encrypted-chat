/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addMessagePreEditListener, addMessagePreSendListener, removeMessagePreEditListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { updateMessage } from "@api/MessageUpdater";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";

import { EncryptChatBarIcon, EncryptIcon } from "./encryptIcon";
import { settings } from "./settings";
import { base64ToUint8, concatArrayBuffers, hash, IV_LEN, stringToUint8, uint8ArraysEqual, uint8ToBase64, uint8ToString } from "./utils";
import { encrypt, decrypt, getChannelKey } from "./cryptoFunctions";

const regexStartEnd = /START\|([a-zA-Z0-9+/]*?={0,3})\|END/g;
const regexPing = /<(@[0-9].{17})>/;

const MESSGE_TYPE_LEN = 1;
const CHECKSUM_LEN = 8; // Ought to be enuf

const HEAD_LEN = MESSGE_TYPE_LEN;

const ENCRYPT_HEAD_LEN = IV_LEN + CHECKSUM_LEN;
const AES_BLOCKSIZE = 16;

enum MessageType {
    Encrypted = 1,
    PubKeyShare = 2,
    PasswordVerify = 3,
}

/*
 * |=============================================================================================|
 * |IMPORTANT - THIS CODE IS DOGSHIT AND NEEDS MAJOR REFACTORING DONT COME AFTER ME BECAUSE OF IT|
 * |=============================================================================================|
*/


const LOGGER = new Logger("EncryptedChat", "#ff9900");

async function createChecksum(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
    return (await hash(bytes)).slice(0, CHECKSUM_LEN);
}

async function messageEncrypt(inText: string, channel_id: string): Promise<string> {
    const textBytes = stringToUint8(inText);
    const checksum = await createChecksum(textBytes);
    const header = new Uint8Array([MessageType.Encrypted]);
    // LOGGER.log(`Encrypt checksum: ${checksum}`);
    const { encrypted, iv } = await encrypt(inText, await getChannelKey(channel_id));
    const messageBytes = concatArrayBuffers(header, iv, checksum, new Uint8Array(encrypted));
    // LOGGER.log(`Message bytes: ${messageBytes.byteLength}, encrypted bytes: ${encrypted.byteLength}`);
    return `START|${uint8ToBase64(messageBytes)}|END`;
}

async function tryMessageHandle(bytes: Uint8Array<ArrayBuffer>, channel_id: string): Promise<undefined | string> {
    const payloadLen = bytes.byteLength - HEAD_LEN;
    if (payloadLen < 0) {
        // This can't be a valid payload since the sizes are wrong
        LOGGER.warn(`Message has valid Start End encoding, yet payload len (${payloadLen}) is too small`);
        // return;
    }

    let read = 0;

    const message_type = bytes.slice(read, MESSGE_TYPE_LEN);
    read += MESSGE_TYPE_LEN;

    switch (message_type[0]) {
        case MessageType.Encrypted:
            return tryMessageDecrypt(bytes.slice(read), channel_id);
        default:
            LOGGER.warn(`Unhandled message type: ${message_type[0]}. Maybe this is due to an outdated version`);

    }

}

async function tryMessageDecrypt(bytes: Uint8Array<ArrayBuffer>, channel_id: string): Promise<undefined | string> {
    const payloadLen = bytes.byteLength - ENCRYPT_HEAD_LEN;

    if (payloadLen <= 0) {
        LOGGER.warn(`Message has valid Start End encoding, yet payload len (${payloadLen}) is wrong Should be bigger than 0`);
        return;
    }

    let read = 0;

    const iv = bytes.slice(read, read + IV_LEN);
    read += IV_LEN;

    const messageChecksum = bytes.slice(read, read + CHECKSUM_LEN);
    read += CHECKSUM_LEN;

    const payload = bytes.slice(read, bytes.byteLength);
    // LOGGER.log("Encrypted Bytes: ", encrypted);

    const decrypted = await decrypt(payload, await getChannelKey(channel_id), iv);
    // LOGGER.log("Decrypted ", decrypted);

    const checksum = await createChecksum(decrypted);

    if (!uint8ArraysEqual(messageChecksum, checksum)) {
        LOGGER.warn("Message decryption was successful but checksums don't match. Your password is most likely wrong.");
        return;
    }
    let text;
    try {
        text = uint8ToString(decrypted);
    } catch {
        LOGGER.warn("Decrypted checksums match, yet encoding threw an exception. This is probably a malicious text injection or smt smt.");

        // Probably something fishy going on
        return;
    }
    return text;
}

// Optimally we'd be doing this using discords delegate system, but eh

function handleIncomingMessage(message: Message) {
    while (true) {
        const matches = regexStartEnd.exec(message.content);
        if (!matches) {
            // LOGGER.info(`Incoming message (${message.content}) didn't match with the regex`);
            break;
        }

        const base64 = matches[1];
        const { index } = matches;
        const { length } = matches[0];
        LOGGER.info(`Matches: '${matches}', ${index}, ${length}`);
        // LOGGER.info(`Extracted base64 part: '${base64}'`);
        const bytes = base64ToUint8(base64);
        if (!bytes) break;

        tryMessageHandle(bytes, message.channel_id).then(function (decrypted: string | undefined) {
            if (!decrypted) {
                // This message probably wasn't encrypted to begin with
                return;
            }
            // This shouldn't cause any raceconditions since ts runs on a single thread :skull:
            // This might be run even before the message has first rendered, is that bad? who knoes
            updateMessage(message.channel_id, message.id, { content: message.content.slice(0, index) + decrypted + message.content.slice(index + length) });
        });
    }

    return message.content;
}


export default definePlugin({
    name: "EncryptedChat",
    description: "A plugin to let you communicate with symmetric encryption in servers (TODO: asymmetric for DMS)",
    authors: [{ name: "Leah", id: 429195069015195650n }, { name: "Fern", id: 972889822857420810n }],
    settings,

    chatBarButton: {
        icon: EncryptIcon,
        render: EncryptChatBarIcon
    },

    handleIncomingMessage,

    patches: [
        {
            find: "!1,hideSimpleEmbedContent",
            replacement: {
                match: /(let{toAST:.{0,125}?)\(\i\?\?\i\).content/,
                replace: "const textReplaceContent=$self.handleIncomingMessage(arguments[2]?.contentMessage??arguments[1]);$&"
            }
        }
    ],

    start() {
        this.onSent = addMessagePreSendListener(async (channelId, messageObj, extra) => {
            if (!settings.store.enableEncryption) return;
            messageObj.content = await messageEncrypt(messageObj.content, channelId);
            return { cancel: false };
        });

        this.onEdit = addMessagePreEditListener(async (channelId, messageId, messageObj) => {
            if (!settings.store.enableEncryption) return;
            messageObj.content = await messageEncrypt(messageObj.content, channelId);
            return { cancel: false };
        });
    },
    stop() {
        removeMessagePreSendListener(this.onSent);
        removeMessagePreEditListener(this.onEdit);
    }
});
