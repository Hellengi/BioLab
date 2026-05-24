import {dom} from "../dom.js";
import {ensureCreateCellPreviewReady} from "./creation.js";
import {closeActiveOrganellePanel} from "./creation-organelle.js";

const TAB_PANELS = {
    control: "tabControl",
    settings: "tabSettings",
    selected: "tabSelected",
    create: "tabCreate",
    species: "tabSpecies",
    logs: "tabLogs",
};

let _activeTab = "control";

export function initTabs() {
    const tabButtons = document.querySelectorAll(".sidebar-tab");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;
            if (tab) switchTab(tab);
        });
    });
}

export function switchTab(tabKey) {
    if (tabKey === "selected" && dom.selectedCellTab?.disabled) {
        return;
    }

    _activeTab = tabKey;

    document.querySelectorAll(".sidebar-tab").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabKey);
    });

    Object.entries(TAB_PANELS).forEach(([key, panelId]) => {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.classList.toggle("hidden", key !== tabKey);
        }
    });

    if (tabKey === "create") {
        ensureCreateCellPreviewReady().catch(err => {
            console.error("Create cell preview init error", err);
        });
    }

    if (tabKey !== "create") {
        closeActiveOrganellePanel();
    }
}

export function setSelectedTabEnabled(enabled) {
    if (!dom.selectedCellTab) return;

    dom.selectedCellTab.disabled = !enabled;
    dom.selectedCellTab.classList.toggle("sidebar-tab--disabled", !enabled);
}

export function getActiveTab() {
    return _activeTab;
}