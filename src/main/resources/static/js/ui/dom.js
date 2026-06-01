function requireEl(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Required DOM element not found: #${id}`);
    return el;
}

function optionalEl(id) {
    return document.getElementById(id);
}

export const dom = {};

export function bindDom() {

    dom.canvas = requireEl("environment");
    dom.ctx = requireEl("environment").getContext("2d");

    dom.createCellPreviewCanvas = optionalEl("createCellPreviewCanvas");
    dom.createCellPreviewCtx = optionalEl("createCellPreviewCanvas")?.getContext("2d");

    dom.stats = requireEl("stats");
    dom.fpsLabel = optionalEl("fpsLabel");
    dom.tempDisplay = requireEl("tempDisplay");
    dom.timeSlider = requireEl("timeSlider");
    dom.pauseBtn = requireEl("pauseBtn");
    dom.temperatureLabel = requireEl("temperatureLabel");
    dom.speedLabel = requireEl("speedLabel");
    dom.resetBtn = requireEl("resetBtn");
    dom.sidebarToggleBtn = optionalEl("sidebarToggleBtn");

    dom.initialCellCountSlider = optionalEl("initialCellCountSlider");
    dom.initialCellCountValue = optionalEl("initialCellCountValue");

    dom.foodSpawnRateSlider = optionalEl("foodSpawnRateSlider");
    dom.foodSpawnRateValue = optionalEl("foodSpawnRateValue");

    dom.viscositySlider = optionalEl("viscositySlider");
    dom.viscosityValue = optionalEl("viscosityValue");

    dom.turbiditySlider = optionalEl("turbiditySlider");
    dom.turbidityValue = optionalEl("turbidityValue");

    dom.gravitySlider = optionalEl("gravitySlider");
    dom.gravityValue = optionalEl("gravityValue");

    dom.radiationSlider = optionalEl("radiationSlider");
    dom.radiationValue = optionalEl("radiationValue");

    dom.globalLightSlider = optionalEl("globalLightSlider");
    dom.globalLightValue = optionalEl("globalLightValue");

    dom.globalLightCycleEnabled = optionalEl("globalLightCycleEnabled");
    dom.globalLightCycleMinSlider = optionalEl("globalLightCycleMinSlider");
    dom.globalLightCycleMinValue = optionalEl("globalLightCycleMinValue");
    dom.globalLightCyclePeriodSlider = optionalEl("globalLightCyclePeriodSlider");
    dom.globalLightCyclePeriodValue = optionalEl("globalLightCyclePeriodValue");

    dom.localLightSourcesEnabled = optionalEl("localLightSourcesEnabled");
    dom.localLightSourceFields = optionalEl("localLightSourceFields");

    dom.lightSourceCountTicks = optionalEl("lightSourceCountTicks");
    dom.lightSourceCountSlider = optionalEl("lightSourceCountSlider");
    dom.lightSourceStartAngleTicks = optionalEl("lightSourceStartAngleTicks");
    dom.lightSourceStartAngleSlider = optionalEl("lightSourceStartAngleSlider");
    dom.lightSourceStartAngleLabel = optionalEl("lightSourceStartAngleLabel");
    dom.lightSourceBrightnessSlider = optionalEl("lightSourceBrightnessSlider");
    dom.lightSourceBrightnessValue = optionalEl("lightSourceBrightnessValue");
    dom.lightSourceOrbitRadiusSlider = optionalEl("lightSourceOrbitRadiusSlider");
    dom.lightSourceOrbitRadiusValue = optionalEl("lightSourceOrbitRadiusValue");
    dom.lightSourceOrbitSpeedSlider = optionalEl("lightSourceOrbitSpeedSlider");
    dom.lightSourceOrbitSpeedValue = optionalEl("lightSourceOrbitSpeedValue");

    dom.resetSettingsBtn = optionalEl("resetSettingsBtn");

    dom.lightCycleFields = optionalEl("lightCycleFields");

    dom.cursorReadoutDisplay = optionalEl("lightProbeDisplay");

    dom.selectedCellContent = optionalEl("selectedCellContent");

    dom.selectedCellMass = optionalEl("selectedCellMass");
    dom.selectedCellEnergy = optionalEl("selectedCellEnergy");
    dom.selectedCellDensity = optionalEl("selectedCellDensity");
    dom.selectedCellRadius = optionalEl("selectedCellRadius");
    dom.selectedCellDivisionThreshold = optionalEl("selectedCellDivisionThreshold");
    dom.selectedCellDivisionImpulse = optionalEl("selectedCellDivisionImpulse");
    dom.selectedCellDivisionAngle = optionalEl("selectedCellDivisionAngle");
    dom.selectedCellElasticity = optionalEl("selectedCellElasticity");
    dom.selectedCellRgb = optionalEl("selectedCellRgb");
    dom.selectedCellCode = optionalEl("selectedCellCode");
    dom.selectedCellPreviewCanvas = optionalEl("selectedCellPreviewCanvas");
    dom.selectedCellPreviewCtx = optionalEl("selectedCellPreviewCanvas")?.getContext("2d");

    dom.saveSelectedCellBtn = optionalEl("saveSelectedCellBtn");

    dom.selectedCellSpeed = optionalEl("selectedCellSpeed");
    dom.selectedCellGravBuoyForce = optionalEl("selectedCellGravBuoyForce");
    dom.selectedCellGravBuoyLabel = optionalEl("selectedCellGravBuoyLabel");
    dom.selectedCellDragForce = optionalEl("selectedCellDragForce");
    dom.selectedCellCollisionImpulse = optionalEl("selectedCellCollisionImpulse");

    dom.forceViewToggleBtn   = optionalEl("forceViewToggleBtn");
    dom.forceViewIndicator   = optionalEl("forceViewIndicator");
    dom.forceLegend          = optionalEl("forceLegend");

    dom.organellePanelHost   = optionalEl("organellePanelHost");

    dom.selectedCellIllumination = optionalEl("selectedCellIllumination");

    dom.placeCellModeBtn = optionalEl("placeCellModeBtn");
    dom.createCellModeHint = optionalEl("createCellModeHint");

    dom.createDivisionThresholdSlider = optionalEl("createDivisionThresholdSlider");
    dom.createDivisionThresholdInput = optionalEl("createDivisionThresholdInput");

    dom.createDivisionImpulseSlider = optionalEl("createDivisionImpulseSlider");
    dom.createDivisionImpulseInput = optionalEl("createDivisionImpulseInput");

    dom.createDivisionAngleSlider = optionalEl("createDivisionAngleSlider");
    dom.createDivisionAngleInput = optionalEl("createDivisionAngleInput");

    dom.createColorHueSlider = optionalEl("createColorHueSlider");
    dom.createColorHueInput = optionalEl("createColorHueInput");

    dom.createSaturationSlider = optionalEl("createSaturationSlider");
    dom.createSaturationInput = optionalEl("createSaturationInput");

    dom.createLightnessSlider = optionalEl("createLightnessSlider");
    dom.createLightnessInput = optionalEl("createLightnessInput");

    dom.createMaxEnergySlider = optionalEl("createMaxEnergySlider");
    dom.createMaxEnergyInput = optionalEl("createMaxEnergyInput");

    dom.createDryMassSlider = optionalEl("createDryMassSlider");
    dom.createDryMassInput = optionalEl("createDryMassInput");

    dom.createElasticitySlider = optionalEl("createElasticitySlider");
    dom.createElasticityInput = optionalEl("createElasticityInput");

    dom.createChloroplastAmountSlider = optionalEl("createChloroplastAmountSlider");
    dom.createChloroplastAmountInput =  optionalEl("createChloroplastAmountInput");

    dom.createChlorophyllSlider = optionalEl("createChlorophyllSlider");
    dom.createChlorophyllInput =  optionalEl("createChlorophyllInput");

    dom.createCarotenoidsSlider = optionalEl("createCarotenoidsSlider");
    dom.createCarotenoidsInput =  optionalEl("createCarotenoidsInput");

    dom.exportWorldBtn = optionalEl("exportWorldBtn");
    dom.importWorldBtn = optionalEl("importWorldBtn");

    dom.saveWorldModal = optionalEl("saveWorldModal");
    dom.saveWorldNameInput = optionalEl("saveWorldNameInput");
    dom.saveWorldCancelBtn = optionalEl("saveWorldCancelBtn");
    dom.saveWorldConfirmBtn = optionalEl("saveWorldConfirmBtn");

    dom.loadWorldModal = optionalEl("loadWorldModal");
    dom.worldSnapshotsList = optionalEl("worldSnapshotsList");
    dom.loadWorldCancelBtn = optionalEl("loadWorldCancelBtn");
    dom.loadWorldDeleteBtn = optionalEl("loadWorldDeleteBtn");
    dom.loadWorldConfirmBtn = optionalEl("loadWorldConfirmBtn");

    dom.saveSelectedCellModal = optionalEl("saveSelectedCellModal");
    dom.saveSelectedCellNameInput = optionalEl("saveSelectedCellNameInput");
    dom.saveSelectedCellCancelBtn = optionalEl("saveSelectedCellCancelBtn");
    dom.saveSelectedCellConfirmBtn = optionalEl("saveSelectedCellConfirmBtn");
    dom.selectedCellTab = optionalEl("selectedCellTab");

    dom.exportCellBtn = optionalEl("exportCellBtn");
    dom.importCellBtn = optionalEl("importCellBtn");

    dom.saveCellModal = optionalEl("saveCellModal");
    dom.saveCellNameInput = optionalEl("saveCellNameInput");
    dom.saveCellCancelBtn = optionalEl("saveCellCancelBtn");
    dom.saveCellConfirmBtn = optionalEl("saveCellConfirmBtn");

    dom.loadCellModal = optionalEl("loadCellModal");
    dom.strainsList = optionalEl("strainsList");
    dom.loadCellCancelBtn = optionalEl("loadCellCancelBtn");
    dom.loadCellDeleteBtn = optionalEl("loadCellDeleteBtn");
    dom.loadCellConfirmBtn = optionalEl("loadCellConfirmBtn");
}