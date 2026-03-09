/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Margins } from "@components/margins";
import { Paragraph } from "@components/Paragraph";
import { classNameFactory } from "@utils/css";
import { getCurrentChannel } from "@utils/discord";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { IconComponent } from "@utils/types";
import { Alerts } from "@webpack/common";
import { MouseEvent } from "react";

import { encryptedStore } from "./encryptedStore";
import { settings } from "./settings";

export const cl = classNameFactory("enc-");

export const EncryptIcon: IconComponent = ({ height = 30, width = 20, className }) => {
    return (
        <svg
            viewBox="0 96 960 960"
            height={height}
            width={width}
            className={className}
        >
            <path fill="currentColor" d="M 399.244 -102.4 C 275.042 -102.4 174.338 -1.689 174.338 122.511 L 174.338 304.838 C 94.835 312.249 33.879 379.039 33.879 458.894 L 33.879 964.888 C 35.117 998.456 62.15 1025.49 95.718 1026.73 L 854.532 1026.73 C 888.806 1025.84 916.368 998.279 917.251 964.005 L 917.251 458.894 C 917.251 379.039 856.299 312.249 776.795 304.838 L 776.795 122.511 C 776.795 -1.689 676.091 -102.4 551.889 -102.4 L 399.244 -102.4 Z M 412.847 -31.719 L 538.286 -31.719 C 624.856 -31.719 695.172 38.241 695.526 124.801 L 695.526 304.838 L 255.608 304.838 L 255.608 124.801 C 255.961 38.241 326.277 -31.719 412.847 -31.719 M 490.054 426.738 C 528.569 426.738 559.309 439.101 582.454 463.846 C 605.422 488.406 616.906 521.265 616.906 562.606 L 616.906 775.317 L 576.801 775.317 L 576.801 745.635 C 569.734 756.942 560.193 766.306 548.709 773.02 C 536.872 778.85 523.446 781.854 508.429 781.854 C 478.57 781.854 453.835 770.723 434.579 748.816 C 415.32 726.379 405.781 697.756 405.781 662.952 C 405.781 628.147 415.32 599.702 434.579 577.797 C 453.835 555.897 478.57 544.587 508.429 544.052 C 522.563 543.7 536.342 547.063 548.709 553.772 C 560.9 560.13 570.617 568.963 577.507 580.273 L 577.507 562.606 C 577.507 534.164 569.557 511.193 553.48 493.526 C 537.402 475.858 516.024 467.025 489.17 467.025 C 443.765 467.025 407.37 484.692 379.985 520.027 C 353.309 555.361 339.881 603.236 339.881 663.659 C 339.881 724.257 355.075 772.49 385.64 808.355 C 416.204 844.22 456.486 862.417 506.838 862.946 L 537.402 859.59 C 547.12 858.001 557.19 855.351 567.967 851.64 L 580.688 888.564 C 569.734 893.335 558.073 896.869 546.236 898.989 L 514.082 902.169 C 447.652 902.169 395.18 880.791 356.665 838.036 C 318.15 795.104 298.893 737.155 298.893 663.659 C 298.893 591.399 316.207 534.164 351.012 491.936 C 385.816 449.524 432.282 428.16 490.054 427.624 M 514.082 584.155 C 493.764 584.155 477.686 591.399 465.85 605.886 C 454.188 620.374 448.182 639.278 448.182 662.952 C 448.182 686.45 454.188 705.706 465.85 720.724 C 477.686 734.682 493.764 741.572 514.082 741.572 C 533.339 741.572 548.886 734.682 560.723 720.724 C 572.384 706.237 578.39 686.98 578.39 662.952 C 578.39 638.748 572.384 620.02 560.723 606.769 C 548.886 591.75 533.163 584.155 513.374 584.155" />
        </svg >
    );
};

function EncryptMessagesToggle() {
    const value = settings.use(["enableEncryption"]).enableEncryption;

    return (
        <FormSwitch
            title="Encrypt messages"
            description="Enable or disable encryption for messages you send"
            value={value}
            onChange={v => settings.store.enableEncryption = v}
            hideBorder
        />
    );
}


function startKeyExchange(e: MouseEvent) {

}

export function EncryptModal({ rootProps }: { rootProps: ModalProps; }) {
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
                <Button className={cl("modal-button")} disabled={!KeyExchangePossible} onClick={startKeyExchange}>
                    Start Key Exchange
                </Button>
            </ModalContent>

        </ModalRoot>
    );
}

export const EncryptChatBarIcon: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;

    const { enableEncryption } = settings.use(["enableEncryption"]);

    const toggle = () => {
        const newState = !enableEncryption;
        settings.store.enableEncryption = newState;
        if (!settings.store.showToggleAlerts) return;
        if (newState) {
            Alerts.show({
                title: "Message Encryption enabled!",
                body: <>
                    <Divider className={Margins.bottom16} />
                    <Paragraph>
                        The message encryption is now enabled. Anyone without the plugin or the password won't be able to read your messages anymore.
                    </Paragraph>
                </>,
                confirmText: "Got it",
                cancelText: "Don't show again",
                onCancel: () => settings.store.showToggleAlerts = false
            });
        }
        else {
            Alerts.show({
                title: "Message Encryption disabled!",
                body: <>
                    <Divider className={Margins.bottom16} />
                    <Paragraph>
                        The message encryption is now disabled (Mind that decryption stays unaffected). Your messages will now be sent in plain text. This also counts for messages that have been sent in an encrypted fashion but are edited. So watch out what you write 👀
                    </Paragraph>
                </>,
                confirmText: "Got it",
                cancelText: "Don't show again",
                onCancel: () => settings.store.showToggleAlerts = false
            });
        }
    };

    const button = (
        <ChatBarButton
            tooltip="Toggle encryption"
            onClick={e => {
                if (!encryptedStore.isInit()) {
                    encryptedStore.user_prompt_store();
                    return;
                }

                if (e.shiftKey) {
                    toggle();
                    return;
                }
                openModal(props => (
                    <EncryptModal rootProps={props} />
                ));
            }}
        >
            <EncryptIcon className={cl({ "activated": enableEncryption })} />
        </ChatBarButton>
    );

    return button;
};
