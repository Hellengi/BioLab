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

    environmentNameInput: optionalEl("environmentNameInput"),
    saveEnvironmentBtn: optionalEl("saveEnvironmentBtn"),
    environmentSnapshotsList: optionalEl("environmentSnapshotsList"),
    loadSelectedWorldBtn: optionalEl("loadSelectedWorldBtn"),
    deleteSelectedWorldBtn: optionalEl("deleteSelectedWorldBtn"),

    cellPanelEmpty: optionalEl("cellPanelEmpty"),
    cellPanelSelected: optionalEl("cellPanelSelected"),
    cellPanelCreate: optionalEl("cellPanelCreate"),

    selectedCellCode: optionalEl("selectedCellCode"),
    selectedCellEnergy: optionalEl("selectedCellEnergy"),
    selectedCellDivisionThreshold: optionalEl("selectedCellDivisionThreshold"),
    selectedCellDivisionImpulse: optionalEl("selectedCellDivisionImpulse"),
    selectedCellRgb: optionalEl("selectedCellRgb"),
    selectedCellSpeed: optionalEl("selectedCellSpeed"),

    saveSelectedCellNameInput: optionalEl("saveSelectedCellNameInput"),
    saveSelectedCellBtn: optionalEl("saveSelectedCellBtn"),
    saveSelectedCellSuccess: optionalEl("saveSelectedCellSuccess"),

    cellTemplatesList: optionalEl("cellTemplatesList"),
    loadCellTemplateBtn: optionalEl("loadCellTemplateBtn"),
    deleteCellTemplateBtn: optionalEl("deleteCellTemplateBtn"),

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