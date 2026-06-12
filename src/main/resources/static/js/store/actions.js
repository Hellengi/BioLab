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
import {
    applyDisplayFromConfig,
    applyPauseButtonState,
    updateMetricsDisplay,
    updateTimeDisplay,
} from "../ui/toolbar.js";
import { t } from "../localization/localization.js";
import { setCanvasWorldSize, syncCanvasCameraToViewport } from "../ui/panels/canvas-camera.js";

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

    setCanvasWorldSize(state.config.tubeDiameter);
    syncCanvasCameraToViewport();

    if (!sliderState.isDragging) {
        dom.timeSlider.value = String(state.config.timeSlider?.value ?? 50);
    }

    applyDisplayFromConfig(state.config.temperatureCelsius, state.config.speedFactor);
    applyPauseButtonState(state.config.paused);
    updateMetricsDisplay(state.fps, state.tps, state.config.paused);
}

// ── Статистика ───────────────────────────────────────────────────────────────

/** Обновляет нижнюю статистику среды, время и FPS/TPS. */
export function updateStats() {
    if (!state.world || !state.config) return;

    const cells = state.world.cells ?? [];
    const foods = state.world.foods ?? [];
    const deadCount = cells.filter(cell => cell.dead).length;

    if (dom.cellsCountValue) {
        dom.cellsCountValue.textContent = String(cells.length);
    }
    if (dom.deadCellsCountValue) {
        dom.deadCellsCountValue.textContent = String(deadCount);
    }
    if (dom.foodCountValue) {
        dom.foodCountValue.textContent = String(foods.length);
    }
    if (dom.diameterValue) {
        dom.diameterValue.textContent = String(state.config.tubeDiameter);
    }

    // Fallback для старой разметки, если проект временно запущен без нижней панели.
    if (dom.stats) {
        dom.stats.textContent = t("stats.line", {
            cells: cells.length,
            dead: deadCount,
            food: foods.length,
            diameter: state.config.tubeDiameter,
        });
    }

    updateTimeDisplay(state.world.time, state.world.tick);
    updateMetricsDisplay(state.fps, state.tps, state.config.paused);
}

// ── Жизненный цикл симуляции ─────────────────────────────────────────────────

/** Сбрасывает симуляцию до начального состояния. */
export async function handleSimulationReset(options = {}) {
    await resetSimulation({ logEvent: options.logEvent !== false });
    resetClientState();
    await loadSimulationConfig();
    applySimulationConfig();
    resetCreatePanelFromConfig();
    render(dom.ctx, state);
    updateStats();
}

/** Сбрасывает клиентское состояние (без обращения к серверу). */
export function resetClientState() {
    state.world = null;
    state.cellById = new Map();
    state.selectedCellDetailsById = new Map();
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










