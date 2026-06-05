
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

    dom.stats = optionalEl("stats");
    dom.bottomStatusBar = optionalEl("bottomStatusBar");
    dom.cellsCountValue = optionalEl("cellsCountValue");
    dom.deadCellsCountValue = optionalEl("deadCellsCountValue");
    dom.foodCountValue = optionalEl("foodCountValue");
    dom.diameterValue = optionalEl("diameterValue");

    dom.fpsLabel = optionalEl("fpsLabel");
    dom.fpsValue = optionalEl("fpsValue");
    dom.tpsValue = optionalEl("tpsValue");
    dom.environmentScroll = optionalEl("environmentScroll") ?? document.querySelector(".environment-scroll");
    dom.environmentWrap = dom.environmentScroll?.querySelector(".environment-wrap") ?? optionalEl("environmentWrap");
    dom.timeDisplay = optionalEl("timeDisplay");
    dom.timeYearsDays = optionalEl("timeYearsDays");
    dom.timeClock = optionalEl("timeClock");
    dom.timeTooltip = optionalEl("timeTooltip");
    dom.timeTooltipTick = optionalEl("timeTooltipTick");
    dom.timeSlider = requireEl("timeSlider");
    dom.pauseBtn = requireEl("pauseBtn");
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

    dom.opacityLayerToggle = optionalEl("opacityLayerToggle");
    dom.lightDirectionLayerToggle = optionalEl("lightDirectionLayerToggle");
    dom.quadtreeLayerToggle = optionalEl("quadtreeLayerToggle");
    dom.cellDirectionsLayerToggle = optionalEl("cellDirectionsLayerToggle");

    dom.selectedCellTitle = optionalEl("selectedCellTitle");
    dom.selectedCellContent = optionalEl("selectedCellContent");

    dom.selectedCellMass = optionalEl("selectedCellMass");
    dom.selectedCellEnergy = optionalEl("selectedCellEnergy");
    dom.selectedCellDensity = optionalEl("selectedCellDensity");
    dom.selectedCellRadius = optionalEl("selectedCellRadius");
    dom.selectedCellDivisionThreshold = optionalEl("selectedCellDivisionThreshold");
    dom.selectedCellDivisionImpulse = optionalEl("selectedCellDivisionImpulse");
    dom.selectedCellDivisionAngle = optionalEl("selectedCellDivisionAngle");
    dom.selectedCellElasticity = optionalEl("selectedCellElasticity");
    dom.selectedCellGfp = optionalEl("selectedCellGfp");
    dom.selectedCellOpacity = optionalEl("selectedCellOpacity");
    dom.selectedCellMembraneOpacity = optionalEl("selectedCellMembraneOpacity");
    dom.selectedCellDamage = optionalEl("selectedCellDamage");
    dom.selectedCellCpDamage = optionalEl("selectedCellCpDamage");
    dom.selectedCellRgb = optionalEl("selectedCellRgb");
    dom.selectedCellEnergyProduction = optionalEl("selectedCellEnergyProduction");
    dom.selectedCellEnergyConsumption = optionalEl("selectedCellEnergyConsumption");
    dom.selectedCellCarotProtection = optionalEl("selectedCellCarotProtection");
    dom.selectedCellCode = optionalEl("selectedCellCode");
    dom.selectedCellPreviewCanvas = optionalEl("selectedCellPreviewCanvas");
    dom.selectedCellPreviewCtx = optionalEl("selectedCellPreviewCanvas")?.getContext("2d");

    dom.saveSelectedCellBtn = optionalEl("saveSelectedCellBtn");

    dom.selectedCellSpeed = optionalEl("selectedCellSpeed");
    dom.selectedCellGravBuoyForce = optionalEl("selectedCellGravBuoyForce");
    dom.selectedCellGravBuoyLabel = optionalEl("selectedCellGravBuoyLabel");
    dom.selectedCellDragForce = optionalEl("selectedCellDragForce");
    dom.selectedCellCollisionImpulse = optionalEl("selectedCellCollisionImpulse");

    dom.forceViewIndicator   = optionalEl("forceViewIndicator");
    dom.selectedPreviewEventIndicator = optionalEl("selectedPreviewEventIndicator");
    dom.previewLayerControls = optionalEl("previewLayerControls");
    dom.createPreviewLayerControls = optionalEl("createPreviewLayerControls");
    dom.previewLayerButtons  = Array.from(document.querySelectorAll("[data-preview-layer-count]"));
    dom.selectedPreviewModeControls = optionalEl("selectedPreviewModeControls");
    dom.selectedPreviewModeButtons = Array.from(document.querySelectorAll("[data-preview-mode]"));
    dom.selectedInfoScopeControls = optionalEl("selectedInfoScopeControls");
    dom.selectedInfoGrid = optionalEl("selectedInfoGrid");
    dom.createInfoScopeControls = optionalEl("createInfoScopeControls");
    dom.createInfoGrid = optionalEl("createInfoGrid");

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

    dom.createMaxEnergySlider = optionalEl("createMaxEnergySlider");
    dom.createMaxEnergyInput = optionalEl("createMaxEnergyInput");

    dom.createDryMassSlider = optionalEl("createDryMassSlider");
    dom.createDryMassInput = optionalEl("createDryMassInput");

    dom.createElasticitySlider = optionalEl("createElasticitySlider");
    dom.createElasticityInput = optionalEl("createElasticityInput");

    dom.createGfpSlider = optionalEl("createGfpSlider");
    dom.createGfpInput = optionalEl("createGfpInput");

    dom.melaninEnabled = optionalEl("melaninEnabled");
    dom.createMelaninPercentSlider = optionalEl("createMelaninPercentSlider");
    dom.createMelaninPercentInput = optionalEl("createMelaninPercentInput");

    dom.createInfoCellOpacity = optionalEl("createInfoCellOpacity");
    dom.createInfoMembraneOpacity = optionalEl("createInfoMembraneOpacity");
    dom.createInfoDamage = optionalEl("createInfoDamage");
    dom.createInfoCellColor = optionalEl("createInfoCellColor");
    dom.createNucleusDivisionCost = optionalEl("createNucleusDivisionCost");
    dom.createNucleusStartDamage = optionalEl("createNucleusStartDamage");
    dom.createNucleusFormula = optionalEl("createNucleusFormula");

    dom.createStartCellDamageSlider = optionalEl("createStartCellDamageSlider");
    dom.createStartCellDamageInput = optionalEl("createStartCellDamageInput");
    dom.createCytosolGfpCost = optionalEl("createCytosolGfpCost");
    dom.createMembraneOpacity = optionalEl("createMembraneOpacity");
    dom.createMembraneTransmittance = optionalEl("createMembraneTransmittance");
    dom.createChloroplastLightCapture = optionalEl("createChloroplastLightCapture");
    dom.createChloroplastProtection = optionalEl("createChloroplastProtection");

    dom.createChloroplastAmountSlider = optionalEl("createChloroplastAmountSlider");
    dom.createChloroplastAmountInput =  optionalEl("createChloroplastAmountInput");

    dom.createChlorophyllSlider = optionalEl("createChlorophyllSlider");
    dom.createChlorophyllInput =  optionalEl("createChlorophyllInput");

    dom.createCarotenoidsSlider = optionalEl("createCarotenoidsSlider");
    dom.createCarotenoidsInput =  optionalEl("createCarotenoidsInput");

    dom.createStartCpDamageSlider = optionalEl("createStartCpDamageSlider");
    dom.createStartCpDamageInput = optionalEl("createStartCpDamageInput");
    dom.createChloroplastStartDamage = optionalEl("createChloroplastStartDamage");

    dom.createLysosomeAmountSlider = optionalEl("createLysosomeAmountSlider");
    dom.createLysosomeAmountInput = optionalEl("createLysosomeAmountInput");
    dom.createLysosomeEnzymeActivitySlider = optionalEl("createLysosomeEnzymeActivitySlider");
    dom.createLysosomeEnzymeActivityInput = optionalEl("createLysosomeEnzymeActivityInput");
    dom.createLysosomeCapacity = optionalEl("createLysosomeCapacity");
    dom.createLysosomeDigestRate = optionalEl("createLysosomeDigestRate");
    dom.createLysosomeNetYield = optionalEl("createLysosomeNetYield");
    dom.createLysosomeLeakRisk = optionalEl("createLysosomeLeakRisk");

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





