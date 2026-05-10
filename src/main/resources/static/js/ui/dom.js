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

    createCellPreviewCanvas,
    createCellPreviewCtx: createCellPreviewCanvas?.getContext("2d") ?? null,

    stats: requireEl("stats"),
    fpsLabel: optionalEl("fpsLabel"),
    tempDisplay: requireEl("tempDisplay"),
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

    viscositySlider: optionalEl("viscositySlider"),
    viscosityValue: optionalEl("viscosityValue"),

    turbiditySlider: optionalEl("turbiditySlider"),
    turbidityValue: optionalEl("turbidityValue"),

    gravitySlider: optionalEl("gravitySlider"),
    gravityValue: optionalEl("gravityValue"),

    radiationSlider: optionalEl("radiationSlider"),
    radiationValue: optionalEl("radiationValue"),

    globalLightSlider: optionalEl("globalLightSlider"),
    globalLightValue: optionalEl("globalLightValue"),

    globalLightCycleEnabled: optionalEl("globalLightCycleEnabled"),
    globalLightCycleMinSlider: optionalEl("globalLightCycleMinSlider"),
    globalLightCycleMinValue: optionalEl("globalLightCycleMinValue"),
    globalLightCyclePeriodSlider: optionalEl("globalLightCyclePeriodSlider"),
    globalLightCyclePeriodValue: optionalEl("globalLightCyclePeriodValue"),

    localLightSourcesEnabled: optionalEl("localLightSourcesEnabled"),
    localLightSourceFields: optionalEl("localLightSourceFields"),

    lightSourceCountTicks: optionalEl("lightSourceCountTicks"),
    lightSourceCountSlider: optionalEl("lightSourceCountSlider"),
    lightSourceStartAngleTicks: optionalEl("lightSourceStartAngleTicks"),
    lightSourceStartAngleSlider: optionalEl("lightSourceStartAngleSlider"),
    lightSourceStartAngleLabel: optionalEl("lightSourceStartAngleLabel"),
    lightSourceBrightnessSlider: optionalEl("lightSourceBrightnessSlider"),
    lightSourceBrightnessValue: optionalEl("lightSourceBrightnessValue"),
    lightSourceOrbitRadiusSlider: optionalEl("lightSourceOrbitRadiusSlider"),
    lightSourceOrbitRadiusValue: optionalEl("lightSourceOrbitRadiusValue"),
    lightSourceOrbitSpeedSlider: optionalEl("lightSourceOrbitSpeedSlider"),
    lightSourceOrbitSpeedValue: optionalEl("lightSourceOrbitSpeedValue"),

    resetSettingsBtn: optionalEl("resetSettingsBtn"),

    lightCycleFields: optionalEl("lightCycleFields"),

    cursorReadoutDisplay: optionalEl("lightProbeDisplay"),

    selectedCellContent: optionalEl("selectedCellContent"),

    selectedCellMass: optionalEl("selectedCellMass"),
    selectedCellEnergy: optionalEl("selectedCellEnergy"),
    selectedCellDensity: optionalEl("selectedCellDensity"),
    selectedCellRadius: optionalEl("selectedCellRadius"),
    selectedCellDivisionThreshold: optionalEl("selectedCellDivisionThreshold"),
    selectedCellDivisionImpulse: optionalEl("selectedCellDivisionImpulse"),
    selectedCellDivisionAngle: optionalEl("selectedCellDivisionAngle"),
    selectedCellElasticity: optionalEl("selectedCellElasticity"),
    selectedCellRgb: optionalEl("selectedCellRgb"),
    selectedCellCode: optionalEl("selectedCellCode"),
    selectedCellPreviewCanvas: optionalEl("selectedCellPreviewCanvas"),
    selectedCellPreviewCtx: optionalEl("selectedCellPreviewCanvas")?.getContext("2d"),

    saveSelectedCellBtn: optionalEl("saveSelectedCellBtn"),

    selectedCellSpeed: optionalEl("selectedCellSpeed"),
    selectedCellGravBuoyForce: optionalEl("selectedCellGravBuoyForce"),
    selectedCellGravBuoyLabel: optionalEl("selectedCellGravBuoyLabel"),
    selectedCellDragForce: optionalEl("selectedCellDragForce"),
    selectedCellCollisionImpulse: optionalEl("selectedCellCollisionImpulse"),

    forceViewToggle: optionalEl("forceViewToggle"),

    selectedCellIllumination: optionalEl("selectedCellIllumination"),

    placeCellModeBtn: optionalEl("placeCellModeBtn"),
    createCellModeHint: optionalEl("createCellModeHint"),

    createDivisionThresholdSlider: optionalEl("createDivisionThresholdSlider"),
    createDivisionThresholdInput: optionalEl("createDivisionThresholdInput"),

    createDivisionImpulseSlider: optionalEl("createDivisionImpulseSlider"),
    createDivisionImpulseInput: optionalEl("createDivisionImpulseInput"),

    createDivisionAngleSlider: optionalEl("createDivisionAngleSlider"),
    createDivisionAngleInput: optionalEl("createDivisionAngleInput"),

    createInitialSpeedSlider: optionalEl("createInitialSpeedSlider"),
    createInitialSpeedInput: optionalEl("createInitialSpeedInput"),

    createInitialDirectionSlider: optionalEl("createInitialDirectionSlider"),
    createInitialDirectionInput: optionalEl("createInitialDirectionInput"),

    createColorHueSlider: optionalEl("createColorHueSlider"),
    createColorHueInput: optionalEl("createColorHueInput"),

    createSaturationSlider: optionalEl("createSaturationSlider"),
    createSaturationInput: optionalEl("createSaturationInput"),

    createLightnessSlider: optionalEl("createLightnessSlider"),
    createLightnessInput: optionalEl("createLightnessInput"),

    createMaxEnergySlider: optionalEl("createMaxEnergySlider"),
    createMaxEnergyInput: optionalEl("createMaxEnergyInput"),

    createDryMassSlider: document.getElementById("createDryMassSlider"),
    createDryMassInput: document.getElementById("createDryMassInput"),

    createElasticitySlider: optionalEl("createElasticitySlider"),
    createElasticityInput: optionalEl("createElasticityInput"),

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