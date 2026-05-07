function requireEl(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Required DOM element not found: #${id}`);
    return el;
}

function optionalEl(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`DOM element missing: #${id}`);
    return el;
}

const canvas = requireEl("environment");
const selectedCellPreviewCanvas = optionalEl("selectedCellPreviewCanvas");
const createCellPreviewCanvas = optionalEl("createCellPreviewCanvas");

export const dom = {

    canvas,
    ctx: canvas.getContext("2d"),

    selectedCellPreviewCanvas,
    selectedCellPreviewCtx: selectedCellPreviewCanvas?.getContext("2d") ?? null,

    createCellPreviewCanvas,
    createCellPreviewCtx: createCellPreviewCanvas?.getContext("2d") ?? null,

    stats: requireEl("stats"),
    fpsLabel: optionalEl("fpsLabel"),
    timeSlider: requireEl("timeSlider"),
    pauseBtn: requireEl("pauseBtn"),
    temperatureLabel: requireEl("temperatureLabel"),
    speedLabel: requireEl("speedLabel"),
    resetBtn: requireEl("resetBtn"),
    sidebarToggleBtn: optionalEl("sidebarToggleBtn"),

    initialCellCountSlider: optionalEl("initialCellCountSlider"),
    initialCellCountValue: optionalEl("initialCellCountValue"),

    foodSpawnRateSlider: optionalEl("foodSpawnRateSlider"),
    foodSpawnRateValue: optionalEl("foodSpawnRateValue"),

    deadCellLifetimeTicksSlider: optionalEl("deadCellLifetimeTicksSlider"),
    deadCellLifetimeTicksValue: optionalEl("deadCellLifetimeTicksValue"),

    resetSettingsBtn: optionalEl("resetSettingsBtn"),

    selectedCellContent: optionalEl("selectedCellContent"),

    selectedCellCode: optionalEl("selectedCellCode"),
    selectedCellEnergy: optionalEl("selectedCellEnergy"),
    selectedCellDivisionThreshold: optionalEl("selectedCellDivisionThreshold"),
    selectedCellDivisionImpulse: optionalEl("selectedCellDivisionImpulse"),
    selectedCellRgb: optionalEl("selectedCellRgb"),
    selectedCellSpeed: optionalEl("selectedCellSpeed"),

    saveSelectedCellBtn: optionalEl("saveSelectedCellBtn"),

    placeCellModeBtn: optionalEl("placeCellModeBtn"),
    createCellModeHint: optionalEl("createCellModeHint"),

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

    exportWorldBtn: optionalEl("exportWorldBtn"),
    importWorldBtn: optionalEl("importWorldBtn"),

    saveWorldModal: optionalEl("saveWorldModal"),
    saveWorldNameInput: optionalEl("saveWorldNameInput"),
    saveWorldCancelBtn: optionalEl("saveWorldCancelBtn"),
    saveWorldConfirmBtn: optionalEl("saveWorldConfirmBtn"),

    loadWorldModal: optionalEl("loadWorldModal"),
    worldSnapshotsList: optionalEl("worldSnapshotsList"),
    loadWorldCancelBtn: optionalEl("loadWorldCancelBtn"),
    loadWorldDeleteBtn: optionalEl("loadWorldDeleteBtn"),
    loadWorldConfirmBtn: optionalEl("loadWorldConfirmBtn"),

    saveSelectedCellModal: optionalEl("saveSelectedCellModal"),
    saveSelectedCellNameInput: optionalEl("saveSelectedCellNameInput"),
    saveSelectedCellCancelBtn: optionalEl("saveSelectedCellCancelBtn"),
    saveSelectedCellConfirmBtn: optionalEl("saveSelectedCellConfirmBtn"),
    selectedCellTab: optionalEl("selectedCellTab"),

    exportCellBtn: optionalEl("exportCellBtn"),
    importCellBtn: optionalEl("importCellBtn"),

    saveCellModal: optionalEl("saveCellModal"),
    saveCellNameInput: optionalEl("saveCellNameInput"),
    saveCellCancelBtn: optionalEl("saveCellCancelBtn"),
    saveCellConfirmBtn: optionalEl("saveCellConfirmBtn"),

    loadCellModal: optionalEl("loadCellModal"),
    cellTemplatesList: optionalEl("cellTemplatesList"),
    loadCellCancelBtn: optionalEl("loadCellCancelBtn"),
    loadCellDeleteBtn: optionalEl("loadCellDeleteBtn"),
    loadCellConfirmBtn: optionalEl("loadCellConfirmBtn"),
};