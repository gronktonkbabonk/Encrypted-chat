/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    enableEncryption: {
        type: OptionType.BOOLEAN,
        description: "Enable encryption of your messages.",
        default: true
    },
    storedKeys: {
        type: OptionType.CUSTOM,
        hidden: true,
        default: {}
    },
    masterPassSet: { // for later
        type: OptionType.BOOLEAN,
        description: "",
        default: false,
        hidden: true
    },
    showToggleAlerts: {
        type: OptionType.BOOLEAN,
        description: "Show an alert when you shift-click on the chat icon to quickly enable/disable message encryption",
        default: true,
    }
});
