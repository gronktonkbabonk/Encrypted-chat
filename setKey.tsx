/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Heading } from "@components/Heading";
import { Margins } from "@components/margins";
import { getCurrentChannel } from "@utils/discord";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Alerts, Forms, TextInput, useState } from "@webpack/common";

import { deriveKey } from "./deriveKey";
import { settings } from "./settings";
import { cl, hash, stringToUint8, uint8ToBase64 } from "./utils";

export function KeySetModal({ rootProps }: { rootProps: ModalProps; }) {
    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Heading tag="h1" className={cl("modal-title")}>
                    Encrypted Chat
                </Heading>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                Enter de-encryption key for channel {getCurrentChannel()?.name}
                <Divider className={Margins.bottom16} />
                <SetChannelKey rootProps={rootProps} />
            </ModalContent>

        </ModalRoot>
    );
}

async function getChannelIdHash(channel_id: string) {
    return new Uint8Array(await (hash(stringToUint8(channel_id))));
}

function SetChannelKey({ rootProps }: { rootProps: ModalProps; }) {
    const channel_id = getCurrentChannel()?.id ?? -1;
    if (channel_id === -1) return -1;
    const keys = settings.use(["storedKeys"]).storedKeys;
    const [input, setInput] = useState("");

    const setKey = async () => {
        const channelIdHash = await getChannelIdHash(channel_id);
        const derivedKey = await deriveKey(input, channelIdHash);
        const exportedKey = new Uint8Array(await crypto.subtle.exportKey("raw", derivedKey.derived));
        keys[channel_id] = uint8ToBase64(exportedKey);
        console.log(exportedKey);
        console.log(uint8ToBase64(exportedKey));
        Alerts.show({
            title: `De-encryption key set for channel ${getCurrentChannel()?.name}`,
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
                    <Forms.FormText>
                        You already have a Key set for channel ${getCurrentChannel()?.name} and by changing it you won't be able to decrypt old messages.
                    </Forms.FormText>
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
