import { state, sliderState } from "./state.js";
import { getConfig, resetSimulation, updateConfig } from "../transport/api/simulationApi.js";
import { render } from "../render/canvas.js";
import { drawCreateCellPreview, drawSelectedCellPreview } from "../render/preview.js";
import { dom } from "../ui/dom.js";
import { setPlaceMode } from "../ui/panels/creationPanel.js";

export async function loadSimulationConfig() {
    state.config = await getConfig();
}

export function applySimulationConfig() {
    if (!state.config) return;

    if (dom.canvas.width !== state.config.width) {
        dom.canvas.width = state.config.width;
    }

    if (dom.canvas.height !== state.config.height) {
        dom.canvas.height = state.config.height;
    }

    if (!sliderState.isDragging) {
        dom.timeSlider.value = String(state.config.timeSlider ?? 50);
    }

    applyDisplayFromConfig(state.config.temperatureCelsius, state.config.speedFactor);
    applyPauseButtonState(state.config.paused);
}

export async function applySimulationConfig_update() {
    state.config = await getConfig();
    applySimulationConfig();
}

export function updateStats() {
    if (!state.world || !state.config) return;

    if (dom.stats) {
        dom.stats.textContent =
            `Tick: ${state.world.tick} | ` +
            `Cells: ${state.world.cells.length} | ` +
            `Dead: ${state.world.deadCells.length} | ` +
            `Food: ${state.world.foods.length} | ` +
            `${state.config.width}×${state.config.height}`;
    }

    if (dom.fpsLabel) {
        dom.fpsLabel.textContent = `FPS/TPS = ${state.fps}/${state.tps}`;
    }
}

export async function handleSimulationReset() {
    await resetSimulation();
    resetClientState();
    await loadSimulationConfig();
    applySimulationConfig();
    render(dom.ctx, state);
    updateStats();
}

export function resetClientState() {
    state.prevDeadCellsById = new Map();
    state.deadCellDisappearEffects = [];
    state.selectedCellId = null;
    state.selectedCellTemplate = null;
    state.cellDraft = null;
    state.pendingTimeSlider = null;
    state.fps = 0;
    state.tps = 0;

    setPlaceMode(false);
    drawSelectedCellPreview(null, null);
    drawCreateCellPreview();
}

export async function togglePause() {
    state.config = await updateConfig({
        ...state.config,
        paused: !state.config.paused,
    });

    applySimulationConfig();
    updateStats();
    render(dom.ctx, state);
}

export function applyDisplayFromConfig(tempCelsius, speedFactor) {
    if (dom.temperatureLabel) {
        const t = tempCelsius ?? 20;
        dom.temperatureLabel.textContent = `${Math.round(t)}°C`;

        const coldColor = "#60a5fa";
        const normalColor = "#f1f5f9";
        const hotColor = "#f87171";

        let color;
        if (t < 10) {
            const factor = Math.max(0, Math.min(1, (10 - t) / 30));
            color = _lerpColor(normalColor, coldColor, factor);
        } else if (t > 35) {
            const factor = Math.max(0, Math.min(1, (t - 35) / 25));
            color = _lerpColor(normalColor, hotColor, factor);
        } else {
            color = normalColor;
        }

        dom.temperatureLabel.style.color = color;
    }

    if (dom.speedLabel) {
        dom.speedLabel.textContent = `${(speedFactor ?? 0).toFixed(2)}×`;
    }
}

export function applyPauseButtonState(paused) {
    if (!dom.pauseBtn) return;
    dom.pauseBtn.textContent = paused ? "Resume" : "Pause";
    dom.pauseBtn.classList.toggle("paused", paused);
}

function _lerpColor(from, to, t) {
    const f = _hexToRgb(from);
    const s = _hexToRgb(to);
    const r = Math.round(f.r + (s.r - f.r) * t);
    const g = Math.round(f.g + (s.g - f.g) * t);
    const b = Math.round(f.b + (s.b - f.b) * t);
    return `rgb(${r},${g},${b})`;
}

function _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 0, g: 0, b: 0 };
}