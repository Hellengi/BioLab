/**
 * SimulationStore — единый источник истины для клиентского состояния.
 *
 * Все мутации — через мутаторы (set*). Все чтения — через геттеры (get*)
 * или прямое обращение к state.*  (для обратной совместимости экспортируется state).
 */

import { getConfig, resetSimulation } from "../transport/api/simulation.js";
import { render } from "../render/canvas.js";
import { drawCreateCellPreview, drawSelectedCellPreview } from "../render/preview.js";
import { showSidePanel, SidePanel } from "../ui/ui.js";
import { dom } from "../ui/dom.js";

// ---------------------------------------------------------------------------
// State object (единый мутируемый объект)
// ---------------------------------------------------------------------------

export const state = {
    /** @type {import('../transport/api/simulation.js').WorldStateDto | null} */
    world: null,

    /** @type {object | null} Конфиг симуляции, загруженный с сервера */
    config: null,

    /** @type {number | null} id выбранной клетки */
    selectedCellId: null,

    /** @type {object | null} Шаблон выбранной клетки (из генома) */
    selectedCellTemplate: null,

    /** @type {object | null} Черновик создаваемой клетки */
    cellDraft: null,

    /** @type {boolean} Активен ли режим размещения клетки */
    placeMode: false,

    /** @type {object | null} Черновик настроек симуляции в диалоге */
    settingsDraft: null,

    /** @type {Map<number, object>} Индекс живых клеток по id */
    cellById: new Map(),

    /** @type {Map<number, object>} Клетки мёртвых тик назад (для эффекта исчезновения) */
    prevDeadCellsById: new Map(),

    /** @type {Array<object>} Активные эффекты исчезновения мёртвых клеток */
    deadCellDisappearEffects: [],
};

// ---------------------------------------------------------------------------
// Геттеры
// ---------------------------------------------------------------------------

/** Возвращает живую клетку по текущему selectedCellId, или null */
export function getSelectedCell() {
    return state.selectedCellId ? state.cellById.get(state.selectedCellId) ?? null : null;
}

/** Ищет клетку по координатам канваса. Перебирает с конца (верхний слой первый). */
export function findCellAt(x, y) {
    if (!state.world?.cells) return null;
    for (let i = state.world.cells.length - 1; i >= 0; i--) {
        const cell = state.world.cells[i];
        const dx = x - cell.x;
        const dy = y - cell.y;
        if (dx * dx + dy * dy <= cell.radius * cell.radius) return cell;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Мутаторы
// ---------------------------------------------------------------------------

/** Обновляет world + перестраивает индекс клеток */
export function setWorld(worldDto) {
    state.world = worldDto;
    rebuildCellIndex();
}

/** Перестраивает индекс id→cell из текущего state.world */
export function rebuildCellIndex() {
    state.cellById = new Map(
        (state.world?.cells ?? []).map(cell => [cell.id, cell])
    );
}

// ---------------------------------------------------------------------------
// Операции (async actions)
// ---------------------------------------------------------------------------

/** Загружает конфиг с сервера и сохраняет в state */
export async function loadSimulationConfig() {
    state.config = await getConfig();
}

/** Применяет конфиг к DOM: устанавливает размер канваса */
export function applySimulationConfig() {
    if (!state.config) return;
    dom.canvas.width = state.config.width;
    dom.canvas.height = state.config.height;
}

/** Обновляет строку статистики в тулбаре */
export function updateStats() {
    if (!state.world || !state.config || !dom.stats) return;

    dom.stats.textContent =
        `Tick: ${state.world.tick} | ` +
        `Running: ${state.world.running} | ` +
        `Cells: ${state.world.cells.length} | ` +
        `Dead cells: ${state.world.deadCells.length} | ` +
        `Food: ${state.world.foods.length} | ` +
        `World: ${state.config.width}x${state.config.height}`;
}

/** Сброс симуляции на сервере + сброс клиентского состояния */
export async function handleSimulationReset() {
    await resetSimulation();
    resetClientState();
    await loadSimulationConfig();
    applySimulationConfig();
    render(dom.ctx, state);
    updateStats();
}

/**
 * Полный сброс клиентского состояния (без обращения к серверу).
 * Вызывается при reset, load world и инициализации страницы.
 */
export function resetClientState() {
    state.prevDeadCellsById = new Map();
    state.deadCellDisappearEffects = [];
    state.selectedCellId = null;
    state.selectedCellTemplate = null;
    state.cellDraft = null;
    state.placeMode = false;

    if (dom.saveSelectedCellNameInput)    dom.saveSelectedCellNameInput.value = "";
    if (dom.createCellTemplateNameInput) dom.createCellTemplateNameInput.value = "";

    drawSelectedCellPreview(null, null);
    drawCreateCellPreview();
    dom.canvas?.classList.remove("cell-create-mode-active");
    if (dom.createCellModeHint) dom.createCellModeHint.textContent = "Placement mode is off";
    showSidePanel(SidePanel.EMPTY);
}