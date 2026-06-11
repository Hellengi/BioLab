import {dom, bindDom} from "./ui/dom.js";
import {state} from "./store/state.js";
import { render } from "./render/canvas.js";
import { connectSocket, sendDisplayLayers } from "./transport/ws/socket.js";
import { bindEvents } from "./ui/events.js";
import { recordWorldFrame } from "./render/fps.js";
import { loadSettingsIntoPanel } from "./ui/tabs/settings.js";
import { initCreatePanel, syncCreateInfoPanel } from "./ui/tabs/creation.js";
import {applySimulationConfig, loadSimulationConfig, resetClientState, updateStats} from "./store/actions.js";
import { refreshSelection } from "./ui/tabs/selection.js";
import { applyTranslations, initLocalization, t } from "./localization/localization.js";
import { getCanvasCameraState } from "./ui/panels/canvas-camera.js";


let lastRenderedWorld = null;
let lastRenderedConfig = null;
let lastRenderSignature = "";
let lastRenderAtMs = 0;
let lastViewportSubscriptionAtMs = 0;
const VIEWPORT_SUBSCRIPTION_INTERVAL_MS = 120;

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

function animationLoop(now = performance.now()) {
    refreshViewportSubscription(now);
    if (state.world && state.config && shouldRenderWorldFrame(now)) {
        render(dom.ctx, state);
        recordWorldFrame(state.world);
        lastRenderAtMs = now;
    }
    requestAnimationFrame(animationLoop);
}

function refreshViewportSubscription(now) {
    const camera = getCanvasCameraState();
    if (!camera.moving && now - lastViewportSubscriptionAtMs < VIEWPORT_SUBSCRIPTION_INTERVAL_MS * 4) {
        return;
    }
    if (now - lastViewportSubscriptionAtMs < VIEWPORT_SUBSCRIPTION_INTERVAL_MS) {
        return;
    }
    lastViewportSubscriptionAtMs = now;
    sendDisplayLayers();
}

function shouldRenderWorldFrame(now) {
    const signature = currentRenderSignature();
    const worldChanged = state.world !== lastRenderedWorld;
    const configChanged = state.config !== lastRenderedConfig;
    const stateChanged = signature !== lastRenderSignature;
    const camera = getCanvasCameraState();
    const cameraAnimating = Boolean(camera.dragging || camera.moving || camera.zooming);
    const overlayAnimating = Boolean(state.selectedCellId);
    const transientEffectsAnimating = (state.deadCellDisappearEffects?.length ?? 0) > 0;

    if (!worldChanged && !configChanged && !stateChanged && !cameraAnimating && !overlayAnimating && !transientEffectsAnimating) {
        return false;
    }

    // Continuous overlays/effects stay animated, but the expensive full scene is
    // no longer redrawn when neither the world nor the camera changed. This keeps
    // canvas work tied to actual visual changes.
    if ((overlayAnimating || transientEffectsAnimating) && !worldChanged && !configChanged && !stateChanged && !cameraAnimating) {
        const overlayIntervalMs = 1000 / 45;
        if (now - lastRenderAtMs < overlayIntervalMs) {
            return false;
        }
    }

    lastRenderedWorld = state.world;
    lastRenderedConfig = state.config;
    lastRenderSignature = signature;
    return true;
}

function currentRenderSignature() {
    let cameraSignature = "camera:-";
    try {
        const camera = getCanvasCameraState();
        cameraSignature = [
            "camera",
            rounded(camera.x),
            rounded(camera.y),
            rounded(camera.zoom, 10000),
            camera.viewportWidth,
            camera.viewportHeight,
            camera.dpr,
        ].join(":");
    } catch (ignored) {
    }

    return [
        cameraSignature,
        state.selectedCellId ?? "-",
        state.cursorLight == null ? "-" : rounded(state.cursorLight, 1000),
        state.displayLayers?.opacityMap ? 1 : 0,
        state.displayLayers?.directedLightMap ? 1 : 0,
        state.displayLayers?.scatteredLightMap ? 1 : 0,
        state.displayLayers?.lightDirection ? 1 : 0,
        state.displayLayers?.quadtree ? 1 : 0,
        state.displayLayers?.cellDirections ? 1 : 0,
        state.config?.tubeDiameter ?? "-",
    ].join("|");
}

function rounded(value, multiplier = 100) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round(number * multiplier) / multiplier;
}


