/**
 * app.js — точка входа приложения.
 */

import { state, resetClientState, loadSimulationConfig, applySimulationConfig }
    from "./store/SimulationStore.js";
import { dom }          from "./ui/dom.js";
import { render }       from "./render/canvas.js";
import { connectSocket } from "./transport/ws/socket.js";
import { bindEvents }   from "./ui/events.js";
import { showSidePanel, SidePanel } from "./ui/ui.js";
import { loadTemplates } from "./ui/panels/TemplatesPanel.js";

async function initializePage() {
    resetClientState();
    bindEvents();

    try {
        await loadSimulationConfig();
        applySimulationConfig();
    } catch (error) {
        console.error("Config loading error", error);
        dom.stats.textContent = "Ошибка загрузки конфигурации";
        return;
    }

    try {
        await loadTemplates();
    } catch (error) {
        console.error("Templates loading error", error);
        dom.stats.textContent = "Конфигурация загружена, но не удалось загрузить шаблоны клеток";
    }

    showSidePanel(SidePanel.EMPTY);
    connectSocket();
    requestAnimationFrame(animationLoop);
}

function animationLoop() {
    if (state.world && state.config) {
        render(dom.ctx, state);
    }
    requestAnimationFrame(animationLoop);
}

initializePage().catch((error) => {
    console.error("Unexpected initialization error", error);
    dom.stats.textContent = "Ошибка инициализации приложения";
});