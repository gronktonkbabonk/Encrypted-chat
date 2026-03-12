/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Margins } from "@components/margins";
import { Paragraph } from "@components/Paragraph";
import { getCurrentChannel } from "@utils/discord";
import { ModalProps } from "@utils/modal";
import { Alerts, TextInput, useState } from "@webpack/common";

import { deriveKey } from "./cryptoFunctions";
import { settings } from "./settings";
import { getCurrentChannelOrDmName, hash, stringToUint8, uint8ToBase64 } from "./utils";

async function getChannelIdHash(channel_id: string) {
    return new Uint8Array(await (hash(stringToUint8(channel_id))));
}

export function SetChannelKey({ rootProps }: { rootProps: ModalProps; }) {
    const channel_id = getCurrentChannel()?.id ?? -1;
    if (channel_id === -1) return -1;
    const keys = settings.use(["storedKeys"]).storedKeys;
    const [input, setInput] = useState("");

    const setKey = async () => {
        const channelIdHash = await getChannelIdHash(channel_id);
        const { derivedKey } = await deriveKey(input, channelIdHash);
        const exportedKey = new Uint8Array(await crypto.subtle.exportKey("raw", derivedKey));
        keys[channel_id] = uint8ToBase64(exportedKey);
        console.log(exportedKey);
        console.log(uint8ToBase64(exportedKey));
        Alerts.show({
            title: `De-encryption key set for channel ${getCurrentChannelOrDmName()}`,
            body: <></>,
            confirmText: "Got it",
        });
        rootProps.onClose();
    };

    const onSubmit = () => {
        if (keys[channel_id]) {
            Alerts.show({
                title: "Are you sure?",
                body: <>
                    <Paragraph>
                        You already have a Key set for channel {getCurrentChannelOrDmName()} and by changing it you won't be able to decrypt old messages.
                    </Paragraph>
                </>,
                confirmText: "Yes, i'm sure",
                cancelText: "Actually, never mind",
                onCancel: () => rootProps.onClose(),
                onConfirm: () => setKey()
            });
        } else setKey();
    };

    return (
        <div>
            <TextInput value={input} onChange={setInput} className={Margins.bottom16} />

            <Button onClick={onSubmit}>Submit!</Button>
        </div>
    );
}
