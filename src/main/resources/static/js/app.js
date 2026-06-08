import {dom, bindDom} from "./ui/dom.js";
import {state} from "./store/state.js";
import { render } from "./render/canvas.js";
import { connectSocket } from "./transport/ws/socket.js";
import { bindEvents } from "./ui/events.js";
import { recordWorldFrame } from "./render/fps.js";
import { loadSettingsIntoPanel } from "./ui/tabs/settings.js";
import { initCreatePanel, syncCreateInfoPanel } from "./ui/tabs/creation.js";
import {applySimulationConfig, loadSimulationConfig, resetClientState, updateStats} from "./store/actions.js";
import { refreshSelection } from "./ui/tabs/selection.js";
import { applyTranslations, initLocalization, t } from "./localization/localization.js";


document.addEventListener("DOMContentLoaded", async () => {
    try {
        bindDom();
        await initLocalization();
        bindEvents();
        bindLocalizationRefresh();
        await initializePage();
    } catch (error) {
        console.error("Unexpected initialization error", error);
        if (dom.stats) dom.stats.textContent = t("Application initialization error");
    }
});

async function initializePage() {
    resetClientState();

    try {
        await loadSimulationConfig();
        applySimulationConfig();
        await loadSettingsIntoPanel();
    } catch (error) {
        console.error("Config loading error", error);
        if (dom.stats) dom.stats.textContent = t("Config loading error");
        return;
    }

    try {
        await initCreatePanel();
    } catch (error) {
        console.error("Create panel init error", error);
    }

    applyTranslations(document);
    connectSocket();
    requestAnimationFrame(animationLoop);
}

function bindLocalizationRefresh() {
    window.addEventListener("biolab:language-change", () => {
        applySimulationConfig();
        updateStats();
        syncCreateInfoPanel();
        refreshSelection(true);
        applyTranslations(document);
    });
}

function animationLoop() {
    if (state.world && state.config) {
        render(dom.ctx, state);
        recordWorldFrame(state.world);
    }
    requestAnimationFrame(animationLoop);
}


