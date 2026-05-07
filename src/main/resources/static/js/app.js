import { state, resetClientState, loadSimulationConfig, applySimulationConfig } from "./store/store.js";
import { dom } from "./ui/dom.js";
import { render } from "./render/canvas.js";
import { connectSocket } from "./transport/ws/socket.js";
import { bindEvents } from "./ui/events.js";
import { recordWorldFrame } from "./render/fpsMeter.js";
import { loadSettingsIntoPanel } from "./ui/panels/settingsPanel.js";
import { initCreatePanel } from "./ui/panels/creationPanel.js";

async function initializePage() {
    resetClientState();
    bindEvents();

    try {
        await loadSimulationConfig();
        applySimulationConfig();
        loadSettingsIntoPanel();
    } catch (error) {
        console.error("Config loading error", error);
        dom.stats.textContent = "Config loading error";
        return;
    }

    try {
        await initCreatePanel();
    } catch (error) {
        console.error("Create panel init error", error);
    }

    connectSocket();
    requestAnimationFrame(animationLoop);
}

function animationLoop() {
    if (state.world && state.config) {
        render(dom.ctx, state);
        recordWorldFrame(state.world);
    }
    requestAnimationFrame(animationLoop);
}

initializePage().catch((error) => {
    console.error("Unexpected initialization error", error);
    dom.stats.textContent = "Application initialization error";
});