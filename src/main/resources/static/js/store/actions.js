/**
 * store/actions.js
 * Высокоуровневые действия симуляции: загрузка конфига, сброс, пауза.
 * UI-отображение (температура, кнопка паузы) вынесено в ui/toolbar.js.
 */

import { state, sliderState } from "./state.js";
import { getConfig, resetSimulation, updateConfig } from "../transport/api/simulation.js";
import { render } from "../render/canvas.js";
import { drawCreateCellPreview } from "../render/preview.js";
import { dom } from "../ui/dom.js";
import { resetCreatePanelFromConfig, setPlaceMode } from "../ui/tabs/creation.js";
import { clearSelection } from "../ui/tabs/selection.js";
import { applyDisplayFromConfig, applyPauseButtonState } from "../ui/toolbar.js";

// ── Конфигурация ─────────────────────────────────────────────────────────────

/** Загружает конфиг симуляции с сервера и сохраняет в state. */
export async function loadSimulationConfig() {
    state.config = await getConfig();
}

/**
 * Применяет текущий state.config к UI:
 * размер canvas, слайдер времени, отображение температуры и паузы.
 */
export function applySimulationConfig() {
    if (!state.config) return;

    if (dom.canvas.width !== state.config.tubeDiameter) {
        dom.canvas.width = state.config.tubeDiameter;
    }
    if (dom.canvas.height !== state.config.tubeDiameter) {
        dom.canvas.height = state.config.tubeDiameter;
    }

    if (!sliderState.isDragging) {
        dom.timeSlider.value = String(state.config.timeSlider?.value ?? 50);
    }

    applyDisplayFromConfig(state.config.temperatureCelsius, state.config.speedFactor);
    applyPauseButtonState(state.config.paused);
}

// ── Статистика ───────────────────────────────────────────────────────────────

/** Обновляет строку статистики и FPS/TPS в тулбаре. */
export function updateStats() {
    if (!state.world || !state.config) return;

    if (dom.stats) {
        dom.stats.textContent =
            `Tick: ${state.world.tick} | ` +
            `Cells: ${state.world.cells.length} | ` +
            `Dead: ${state.world.cells.filter(cell => cell.dead).length} | ` +
            `Food: ${state.world.foods.length} | ` +
            `Diameter: ${state.config.tubeDiameter}`;
    }

    if (dom.fpsLabel) {
        dom.fpsLabel.textContent = `FPS/TPS = ${state.fps}/${state.tps}`;
    }
}

// ── Жизненный цикл симуляции ─────────────────────────────────────────────────

/** Сбрасывает симуляцию до начального состояния. */
export async function handleSimulationReset() {
    await resetSimulation();
    resetClientState();
    await loadSimulationConfig();
    applySimulationConfig();
    resetCreatePanelFromConfig();
    render(dom.ctx, state);
    updateStats();
}

/** Сбрасывает клиентское состояние (без обращения к серверу). */
export function resetClientState() {
    state.prevDeadCellsById = new Map();
    state.deadCellDisappearEffects = [];
    state.cellDraft = null;
    state.pendingTimeSlider = null;
    state.fps = 0;
    state.tps = 0;

    setPlaceMode(false);
    clearSelection();
    drawCreateCellPreview();
}

/** Переключает паузу симуляции. */
export async function togglePause() {
    state.config = await updateConfig({
        ...state.config,
        paused: !state.config.paused,
    });

    applySimulationConfig();
    updateStats();
    render(dom.ctx, state);
}
