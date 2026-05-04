/**
 * dom.js — единый реестр DOM-ссылок.
 *
 *  1. Все вызовы getElementById обёрнуты в requireEl / optionalEl,
 *     которые бросают ошибку (критичные элементы) или логируют
 *     предупреждение (некритичные), если элемент не найден.
 *  2. Ссылки сгруппированы по функциональным блокам (canvas, toolbar,
 *     settings, cellSidebar, createPanel, selectionPanel)
 *  3. Canvas context получается здесь же, рядом с canvas-элементом.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Возвращает элемент по id.
 * Если не найден — бросает Error (для элементов, без которых страница нерабочая).
 * @param {string} id
 * @returns {HTMLElement}
 */
function requireEl(id) {
    const el = document.getElementById(id);
    if (!el) {
        throw new Error(`Required DOM element not found: #${id}`);
    }
    return el;
}

/**
 * Возвращает элемент по id или null.
 * Если не найден — печатает предупреждение в консоль.
 * @param {string} id
 * @returns {HTMLElement | null}
 */
function optionalEl(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`DOM element missing: #${id}`);
    }
    return el;
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

const canvas = requireEl("environment");
const selectedCellPreviewCanvas = optionalEl("selectedCellPreviewCanvas");
const createCellPreviewCanvas = optionalEl("createCellPreviewCanvas");

// ---------------------------------------------------------------------------
// DOM registry
// ---------------------------------------------------------------------------

export const dom = {

    // --- Canvas & contexts --------------------------------------------------
    canvas,
    ctx: canvas.getContext("2d"),

    selectedCellPreviewCanvas,
    selectedCellPreviewCtx: selectedCellPreviewCanvas?.getContext("2d") ?? null,

    createCellPreviewCanvas,
    createCellPreviewCtx: createCellPreviewCanvas?.getContext("2d") ?? null,

    // --- Toolbar ------------------------------------------------------------
    stats: requireEl("stats"),
    startBtn: requireEl("startBtn"),
    stopBtn: requireEl("stopBtn"),
    resetBtn: requireEl("resetBtn"),

    // --- Settings overlay ---------------------------------------------------
    settingsBtn: requireEl("settingsBtn"),
    settingsOverlay: requireEl("settingsOverlay"),

    initialCellCountSlider: optionalEl("initialCellCountSlider"),
    initialCellCountValue: optionalEl("initialCellCountValue"),

    foodSpawnRateSlider: optionalEl("foodSpawnRateSlider"),
    foodSpawnRateValue: optionalEl("foodSpawnRateValue"),

    deadCellLifetimeTicksSlider: optionalEl("deadCellLifetimeTicksSlider"),
    deadCellLifetimeTicksValue: optionalEl("deadCellLifetimeTicksValue"),

    resetSettingsBtn: optionalEl("resetSettingsBtn"),
    cancelSettingsBtn: optionalEl("cancelSettingsBtn"),
    saveSettingsBtn: optionalEl("saveSettingsBtn"),

    // --- Saves (world persistence) ------------------------------------------
    environmentNameInput: optionalEl("environmentNameInput"),
    saveEnvironmentBtn: optionalEl("saveEnvironmentBtn"),
    environmentSnapshotsList: optionalEl("environmentSnapshotsList"),
    loadSelectedWorldBtn: optionalEl("loadSelectedWorldBtn"),
    deleteSelectedWorldBtn: optionalEl("deleteSelectedWorldBtn"),

    // --- Cell sidebar panels ------------------------------------------------
    cellPanelEmpty: optionalEl("cellPanelEmpty"),
    cellPanelSelected: optionalEl("cellPanelSelected"),
    cellPanelCreate: optionalEl("cellPanelCreate"),

    // --- Selection panel ----------------------------------------------------
    selectedCellCode: optionalEl("selectedCellCode"),
    selectedCellEnergy: optionalEl("selectedCellEnergy"),
    selectedCellDivisionThreshold: optionalEl("selectedCellDivisionThreshold"),
    selectedCellDivisionImpulse: optionalEl("selectedCellDivisionImpulse"),
    selectedCellRgb: optionalEl("selectedCellRgb"),
    selectedCellSpeed: optionalEl("selectedCellSpeed"),

    saveSelectedCellNameInput: optionalEl("saveSelectedCellNameInput"),
    saveSelectedCellBtn: optionalEl("saveSelectedCellBtn"),
    saveSelectedCellSuccess: optionalEl("saveSelectedCellSuccess"),

    // --- Templates panel ----------------------------------------------------
    cellTemplatesList: optionalEl("cellTemplatesList"),
    loadCellTemplateBtn: optionalEl("loadCellTemplateBtn"),
    deleteCellTemplateBtn: optionalEl("deleteCellTemplateBtn"),

    // --- Create cell panel --------------------------------------------------
    startCreateCellBtn: optionalEl("startCreateCellBtn"),
    cancelCreateCellBtn: optionalEl("cancelCreateCellBtn"),
    placeCellModeBtn: optionalEl("placeCellModeBtn"),
    createCellModeHint: optionalEl("createCellModeHint"),

    createCellTemplateNameInput: optionalEl("createCellTemplateNameInput"),
    saveCreateTemplateBtn: optionalEl("saveCreateTemplateBtn"),
    saveCreateTemplateSuccess: optionalEl("saveCreateTemplateSuccess"),

    createDivisionThresholdSlider: optionalEl("createDivisionThresholdSlider"),
    createDivisionThresholdInput: optionalEl("createDivisionThresholdInput"),

    createDivisionImpulseSlider: optionalEl("createDivisionImpulseSlider"),
    createDivisionImpulseInput: optionalEl("createDivisionImpulseInput"),

    createColorHueSlider: optionalEl("createColorHueSlider"),
    createColorHueInput: optionalEl("createColorHueInput"),

    createSaturationSlider: optionalEl("createSaturationSlider"),
    createSaturationInput: optionalEl("createSaturationInput"),

    createLightnessSlider: optionalEl("createLightnessSlider"),
    createLightnessInput: optionalEl("createLightnessInput"),

    createMaxEnergySlider: optionalEl("createMaxEnergySlider"),
    createMaxEnergyInput: optionalEl("createMaxEnergyInput"),
};