/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Heading } from "@components/Heading";
import { Margins } from "@components/margins";
import { Paragraph } from "@components/Paragraph";
import { getCurrentChannel } from "@utils/discord";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { TextInput } from "@webpack/common";

import { EncryptMessagesToggle } from "./encryptIcon";
import { SetChannelKey } from "./setChannelKey";
import { cl, getCurrentChannelOrDmName } from "./utils";


// this is the modal that opens when you initially click on the chatbar icon.
export function EncryptIconModal({ rootProps }: { rootProps: ModalProps; }) {
    const KeyExchangePossible = getCurrentChannel()?.isDM();
    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Heading tag="h1" className={cl("modal-title")}>
                    Encrypted Chat
                </Heading>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <Divider className={Margins.bottom16} />
                <EncryptMessagesToggle />
                <Divider className={Margins.bottom16} />
                <Button className={cl("modal-button")} /* disabled={KeyExchangePossible}*/ onClick={() => { openModal(props => (<KeySetModal rootProps={props} />)); }}>
                    Set Channel Key
                </Button>
                <Divider className={Margins.bottom16} />
                <Button className={[cl("modal-button"), Margins.bottom16].join(" ")} disabled={!KeyExchangePossible} /* onClick={startKeyExchange}*/>
                    Start Key Exchange
                </Button>
            </ModalContent>

        </ModalRoot>
    );
}

// This is the modal that opens when you set the key for a channel
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
                Enter de-encryption key for channel {getCurrentChannelOrDmName()}
                <Divider className={Margins.bottom16} />
                <SetChannelKey rootProps={rootProps} />
            </ModalContent>

        </ModalRoot>
    );
}

// this is the modal that opens when you set the master password
export function MasterPasswordModal({ rootProps, on_confirm }: { rootProps: ModalProps; on_confirm: ((password: string, rootProps: ModalProps) => void); }) {
    let value = "";
    return (
        <ModalRoot {...rootProps} className={cl("modal-root")}>
            <ModalHeader className={cl("modal-header")}>
                <Heading tag="h1" className={cl("modal-title")}>
                    Encrypted Chat
                </Heading>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <Divider className={Margins.bottom16} />
                <Paragraph className={Margins.bottom16}>
                    The key database hasn't been unlocked yet or a master key hasn't yet been set. Please enter a master key.
                </Paragraph>
                <TextInput placeholder="Master key" onChange={v => {
                    value = v;
                }}></TextInput>
                <Button className={cl("modal-button")} onClick={() => {
                    on_confirm(value, rootProps);
                }} >
                    Confirm!
                </Button>
            </ModalContent>

        </ModalRoot>
    );
}
