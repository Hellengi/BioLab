
import { dom } from "../dom.js";
import { state } from "../../store/state.js";
import { drawCreateCellPreview } from "../../render/preview.js";
import { loadSimulationConfig } from "../../store/actions.js";
import { applyInputBounds } from "../panels/_panels.js";
import { sliderBoundsForControl, valueFromSlider, sliderFromValue, roundControlValue } from "../control-scale.js";
import { previewCell, spawnCell } from "../../transport/api/cell.js";
import { formatTwoDecimals, setText } from "../../core/utils.js";
import { clearTooltipElement, setTooltipPairValue, setTooltipValue } from "../cell-info.js";
import { t } from "../../localization/localization.js";
import {
    initOrganellePanels,
    chloroplastEnabled as _getChloroplastEnabled,
    lysosomeEnabled as _getLysosomeEnabled,
    flagellumEnabled as _getFlagellumEnabled,
    flagellumCount as _getFlagellumCount,
    melaninEnabled as _getMelaninEnabled,
    bioluminescenceEnabled as _getBioluminescenceEnabled,
    setChloroplastEnabled,
    setLysosomeEnabled,
    setFlagellumEnabled,
    setFlagellumMode,
    setMelaninEnabled,
    setBioluminescenceEnabled,
    openOrganellePanel,
} from "./creation-organelle.js";


let _createPreviewMetricsRequestId = 0;
let _createPreviewMetricsTimer = 0;

function scaledGenomeField(field) {
    return {
        ...field,
        valueFromRange: raw => valueFromSlider(raw, state.config?.initialGenome?.[field.key]),
        rangeFromValue: value => sliderFromValue(value, state.config?.initialGenome?.[field.key]),
    };
}


export function getCreateCellFields() {
    return [
        { key: "divisionThreshold", range: dom.createDivisionThresholdSlider, input: dom.createDivisionThresholdInput },
        { key: "divisionImpulse",   range: dom.createDivisionImpulseSlider,   input: dom.createDivisionImpulseInput },
        { key: "divisionAngle",     range: dom.createDivisionAngleSlider,     input: dom.createDivisionAngleInput },
        { key: "cytosolArea",         range: dom.createCytosolAreaSlider,         input: dom.createCytosolAreaInput },
        { key: "cytosolDensity",           range: dom.createCytosolDensitySlider,           input: dom.createCytosolDensityInput },
        { key: "elasticity",        range: dom.createElasticitySlider,        input: dom.createElasticityInput },
        { key: "bioluminescence",               range: dom.createBioluminescenceSlider,               input: dom.createBioluminescenceInput },
        { key: "melaninPercent",    range: dom.createMelaninPercentSlider,    input: dom.createMelaninPercentInput },
        { key: "chloroplastAmount", range: dom.createChloroplastAmountSlider, input: dom.createChloroplastAmountInput },
        { key: "chlorophyll",       range: dom.createChlorophyllSlider,       input: dom.createChlorophyllInput },
        { key: "carotenoids",       range: dom.createCarotenoidsSlider,       input: dom.createCarotenoidsInput },
        { key: "lysosomeAmount",    range: dom.createLysosomeAmountSlider,    input: dom.createLysosomeAmountInput },
        { key: "lysosomeEnzymeActivity", range: dom.createLysosomeEnzymeActivitySlider, input: dom.createLysosomeEnzymeActivityInput },
        { key: "flagellumLength",              range: dom.createFlagellumLengthSlider,              input: dom.createFlagellumLengthInput },
        { key: "flagellumMotorPower",          range: dom.createFlagellumMotorPowerSlider,          input: dom.createFlagellumMotorPowerInput },
        { key: "flagellumPairSpreadAngle",     range: dom.createFlagellumPairSpreadAngleSlider,     input: dom.createFlagellumPairSpreadAngleInput },
        { key: "flagellumSteeringAsymmetry",   range: dom.createFlagellumSteeringAsymmetrySlider,   input: dom.createFlagellumSteeringAsymmetryInput },
    ].map(scaledGenomeField);
}

export function getCreateDebugFields() {
    return [
        { key: "startNucleusDamage",       range: dom.createStartNucleusDamageSlider,       input: dom.createStartNucleusDamageInput },
        { key: "startCytosolDamage",       range: dom.createStartCytosolDamageSlider,       input: dom.createStartCytosolDamageInput },
        { key: "startCpDamage",         range: dom.createStartCpDamageSlider,         input: dom.createStartCpDamageInput },
        { key: "startMembraneDamage",   range: dom.createStartMembraneDamageSlider,   input: dom.createStartMembraneDamageInput },
        { key: "startLysosomeDamage",   range: dom.createStartLysosomeDamageSlider,   input: dom.createStartLysosomeDamageInput },
        { key: "startFlagellumDamage",  range: dom.createStartFlagellumDamageSlider,  input: dom.createStartFlagellumDamageInput },
    ];
}

export function getCreateChloroplastFields() {
    // Chloroplast controls are part of the organelle-localized genome fields above.
    // Kept for events.js compatibility without duplicate listeners.
    return [];
}

export async function initCreatePanel() {
    if (!state.config) {
        await loadSimulationConfig();
    }

    // Initialize organelle slide-out panels before the first preview draw.
    // A preview rendering error must not disable organelle-panel buttons.
    initOrganellePanels(onCreateFormChange);
    resetCreatePanelFromConfig();
}

export function resetCreatePanelFromConfig() {
    _applyGenomeInputRanges();
    state.cellDraft = createDraft();
    state.cellDraftPreview = null;
    state.cellDraftPreviewSignature = "";
    setChloroplastEnabled(Boolean(state.config.initialGenome.chloroplastEnabled));
    setLysosomeEnabled(Boolean(state.config.initialGenome.lysosomeEnabled));
    setFlagellumMode(Boolean(state.config.initialGenome.flagellumEnabled) ? (state.config.initialGenome.flagellumCount?.value >= 2 ? "pair" : "single") : "off");
    setMelaninEnabled(Boolean(state.config.initialGenome.melaninEnabled));
    setBioluminescenceEnabled(Boolean(state.config.initialGenome.bioluminescenceEnabled));
    syncDraftToForm();
    setPlaceMode(false);
}

function createDraft() {
    if (!state.config?.initialGenome) throw new Error("Config not loaded");

    const genome = Object.fromEntries(
        getCreateCellFields().map(({ key }) => [key, state.config.initialGenome?.[key]?.value ?? 0])
    );
    genome.code = state.config.initialGenome.code;
    genome.chloroplastEnabled = Boolean(state.config.initialGenome.chloroplastEnabled);
    genome.lysosomeEnabled = Boolean(state.config.initialGenome.lysosomeEnabled);
    genome.flagellumEnabled = Boolean(state.config.initialGenome.flagellumEnabled);
    genome.flagellumCount = Math.max(1, Math.min(2, Math.round(state.config.initialGenome.flagellumCount?.value ?? 1)));
    genome.melaninEnabled = Boolean(state.config.initialGenome.melaninEnabled);
    genome.bioluminescenceEnabled = Boolean(state.config.initialGenome.bioluminescenceEnabled);

    return {
        id: null,
        name: null,
        genome,
        startNucleusDamage: state.config.initialGenome?.startNucleusDamage?.value ?? 0,
        startCytosolDamage: state.config.initialGenome?.startCytosolDamage?.value ?? 0,
        startCpDamage: state.config.initialGenome?.startCpDamage?.value ?? 0,
        startMembraneDamage: state.config.initialGenome?.startMembraneDamage?.value ?? 0,
        startLysosomeDamage: state.config.initialGenome?.startLysosomeDamage?.value ?? 0,
        startFlagellumDamage: state.config.initialGenome?.startFlagellumDamage?.value ?? 0,
    };
}

export function syncDraftToForm() {
    if (!state.cellDraft?.genome) return;
    normalizeFlagellumGeometry(state.cellDraft.genome);
    syncFlagellumDynamicBounds(state.cellDraft.genome);

    for (const { key, range, input, rangeFromValue } of getCreateCellFields()) {
        const value = state.cellDraft.genome[key] ?? state.config?.initialGenome?.[key]?.value ?? 0;
        state.cellDraft.genome[key] = value;
        const displayValue = roundToGenomeStep(key, value);
        const rangeValue = typeof rangeFromValue === "function" ? rangeFromValue(displayValue) : displayValue;
        if (range) range.value = String(rangeValue);
        if (input) input.value = String(displayValue);
    }

    for (const { key, range, input } of getCreateDebugFields()) {
        const value = state.cellDraft[key] ?? state.config?.initialGenome?.[key]?.value ?? 0;
        state.cellDraft[key] = value;
        const v = String(value);
        if (range) range.value = v;
        if (input) input.value = v;
    }

    setChloroplastEnabled(Boolean(state.cellDraft.genome.chloroplastEnabled));
    setLysosomeEnabled(Boolean(state.cellDraft.genome.lysosomeEnabled));
    setFlagellumMode(Boolean(state.cellDraft.genome.flagellumEnabled) ? (state.cellDraft.genome.flagellumCount >= 2 ? "pair" : "single") : "off");
    setMelaninEnabled(Boolean(state.cellDraft.genome.melaninEnabled));
    setBioluminescenceEnabled(Boolean(state.cellDraft.genome.bioluminescenceEnabled));
    if (dom.melaninEnabled) dom.melaninEnabled.checked = Boolean(state.cellDraft.genome.melaninEnabled);
    if (dom.bioluminescenceEnabled) dom.bioluminescenceEnabled.checked = Boolean(state.cellDraft.genome.bioluminescenceEnabled);

    refreshCreatePreviewMetrics();
    syncCreateInfoPanel();
    drawCreateCellPreview();
}

export function readDraftFromForm(changedKey = null) {
    if (!state.cellDraft?.genome) throw new Error("Draft not initialised");

    const draft = { id: null, name: null, genome: {} };

    for (const { key, input } of getCreateCellFields()) {
        const raw = input ? Number(input.value) : NaN;
        draft.genome[key] = _clampGenomeValue(
            key,
            Number.isFinite(raw) ? raw : (state.cellDraft.genome[key] ?? state.config?.initialGenome?.[key]?.value ?? 0)
        );
    }

    for (const { key, input } of getCreateDebugFields()) {
        const raw = input ? Number(input.value) : NaN;
        draft[key] = _clampDebugValue(
            key,
            Number.isFinite(raw) ? raw : (state.cellDraft[key] ?? state.config?.initialGenome?.[key]?.value ?? 0)
        );
    }

    draft.genome.chloroplastEnabled = _getChloroplastEnabled;
    draft.genome.lysosomeEnabled = _getLysosomeEnabled;
    draft.genome.flagellumEnabled = _getFlagellumEnabled;
    draft.genome.flagellumCount = _getFlagellumEnabled
        ? Math.max(1, Math.min(2, Math.round(_getFlagellumCount || 1)))
        : Math.max(1, Math.min(2, Math.round(state.cellDraft.genome.flagellumCount ?? 1)));
    normalizeFlagellumGeometry(draft.genome, changedKey);
    draft.genome.melaninEnabled = _getMelaninEnabled;
    draft.genome.bioluminescenceEnabled = _getBioluminescenceEnabled;
    return draft;
}

export function onCreateFormChange(changedKey = null) {
    if (!state.cellDraft) return;
    state.cellDraft = readDraftFromForm(changedKey);
    syncDraftToForm();
}

export async function toggleCellPlacement() {
    if (!state.cellDraft) await initCreatePanel();

    if (state.placeMode) {
        setPlaceMode(false);
    } else {
        state.cellDraft = readDraftFromForm();
        refreshCreatePreviewMetrics({immediate: true});
        drawCreateCellPreview();
        setPlaceMode(true);
    }
}

export function setPlaceMode(active) {
    state.placeMode = active;

    const hint = dom.createCellModeHint;
    if (hint) {
        hint.classList.remove("preview-mode-badge--create-on", "preview-mode-badge--create-off");
        hint.classList.add(active ? "preview-mode-badge--create-on" : "preview-mode-badge--create-off");
        const textEl = hint.querySelector(".preview-mode-badge-text");
        if (textEl) textEl.textContent = active ? t("Placing ON") : t("Placing OFF");
        hint.title = active ? t("Placement mode ON") : t("Placement mode off");
    }

    if (dom.placeCellModeBtn) {
        dom.placeCellModeBtn.classList.toggle("active", active);
        dom.placeCellModeBtn.title = active ? t("Stop placing") : t("Place on the field");
    }

    dom.canvas?.classList.toggle("cell-create-mode-active", active);
}

export async function spawnDraftCell(x, y) {
    if (!state.cellDraft) return;
    await spawnCell(x, y, state.cellDraft);
}

export async function ensureCreateCellPreviewReady() {
    if (!state.cellDraft) await initCreatePanel();
    refreshCreatePreviewMetrics({immediate: true});
    syncCreateInfoPanel();
    requestAnimationFrame(() => drawCreateCellPreview());
}

function refreshCreatePreviewMetrics(options = {}) {
    if (!state.cellDraft?.genome) return;
    const signature = createPreviewSignature(state.cellDraft);
    if (state.cellDraftPreviewSignature === signature && state.cellDraftPreview) return;

    if (_createPreviewMetricsTimer) {
        clearTimeout(_createPreviewMetricsTimer);
        _createPreviewMetricsTimer = 0;
    }

    const run = () => {
        const requestId = ++_createPreviewMetricsRequestId;
        previewCell(state.cellDraft)
            .then(metrics => {
                if (requestId !== _createPreviewMetricsRequestId) return;
                if (createPreviewSignature(state.cellDraft) !== signature) return;
                state.cellDraftPreview = metrics;
                state.cellDraftPreviewSignature = signature;
                syncCreateInfoPanel();
                drawCreateCellPreview();
            })
            .catch(() => {
                if (requestId !== _createPreviewMetricsRequestId) return;
                state.cellDraftPreview = null;
                state.cellDraftPreviewSignature = "";
            });
    };

    if (options.immediate) {
        run();
    } else {
        _createPreviewMetricsTimer = setTimeout(run, 35);
    }
}

function createPreviewSignature(draft) {
    const genome = draft?.genome ?? {};
    return JSON.stringify({
        genome,
        startNucleusDamage: draft?.startNucleusDamage ?? 0,
        startCytosolDamage: draft?.startCytosolDamage ?? 0,
        startCpDamage: draft?.startCpDamage ?? 0,
        startMembraneDamage: draft?.startMembraneDamage ?? 0,
        startLysosomeDamage: draft?.startLysosomeDamage ?? 0,
        startFlagellumDamage: draft?.startFlagellumDamage ?? 0,
    });
}

function currentCreatePreviewMetrics(options = {}) {
    if (!state.cellDraft || !state.cellDraftPreview) return null;
    const signature = createPreviewSignature(state.cellDraft);
    const exact = state.cellDraftPreviewSignature === signature;
    return exact || options.allowStale ? state.cellDraftPreview : null;
}

export function syncCreateInfoPanel() {
    if (!state.cellDraft?.genome) return;
    const values = _previewValues(state.cellDraft.genome);
    syncCreateScopeButtons();
    const scope = String(state.createInfoScope ?? "general").toLowerCase();
    renderCreateInfoGrid(scope, values);
    syncOrganellePanelReadouts(values);
    if (scope && scope !== "general") {
        openOrganellePanel(scope);
    }
}

function syncCreateScopeButtons() {
    const controls = dom.createInfoScopeControls;
    if (!controls) return;
    for (const button of controls.querySelectorAll("[data-create-info-scope]")) {
        const active = button.dataset.createInfoScope === (state.createInfoScope ?? "general");
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    }
}

function renderCreateInfoGrid(scope, values = null) {
    const grid = dom.createInfoGrid;
    if (!grid || !state.cellDraft?.genome) return;
    clearTooltipElement(grid);
    const g = state.cellDraft.genome;
    const v = values ?? _previewValues(g);

    if (scope === "nucleus") {
        row(grid, "Division threshold", `${formatTwoDecimals(g.divisionThreshold)}%`, "Cell divides when stored energy reaches this percent of its current maximum energy");
        row(grid, "Division impulse", formatTwoDecimals(g.divisionImpulse), "NcDivImpulseCost = NcDivImpulse² / (2 × CellMass)");
        row(grid, "Division angle", `${formatTwoDecimals(g.divisionAngle ?? 0)}°`, "DivisionAxis = CellAngle + NcDivAngle");
        row(grid, "Start nucleus damage", formatTwoDecimals(state.cellDraft.startNucleusDamage ?? 0), "StartNucleusDamage is applied when a cell is spawned from this draft");
        row(grid, "Division cost", formatTwoDecimals(v.divCost), "CellDivEnergyCost = ImpulseCost + organelle division costs");
        return;
    }
    if (scope === "cytosol") {
        row(grid, "Cytosol density", formatTwoDecimals(g.cytosolDensity), "CtMass = CtDensity × CtArea × CtDensityFactor + Energy × EnergyToMassFactor");
        row(grid, "Cytosol area", formatTwoDecimals(g.cytosolArea), "CtArea defines cytoplasm size; MaxEnergy = CtArea × EnergyCapacityFactor");
        row(grid, "Bioluminescence enabled", g.bioluminescenceEnabled ? "on" : "off", "Bioluminescence is an optional cytosol parameter and can mutate on/off like optional organelles");
        row(grid, "Bioluminescence", formatTwoDecimals(g.bioluminescence ?? 0), "BioluminescenceEnergyConsumption = BioluminescenceExpression × CytosolBioluminescenceConsumptionFactor");
        row(grid, "Start cytosol damage", formatTwoDecimals(state.cellDraft.startCytosolDamage ?? 0), "Initial cytosol damage; cytosol damage controls cell death and global stress effects");
        row(grid, "Cytosol color", `${v.cytosolColor.r}, ${v.cytosolColor.g}, ${v.cytosolColor.b} / ${formatTwoDecimals(v.cytosolColor.opacity)}`, "CytosolColor = weighted(BaseCytosolColor, Nucleus/Chloroplast/Lysosome influence, CytosolDamage)");
        return;
    }
    if (scope === "membrane") {
        row(grid, "Elasticity", formatTwoDecimals(g.elasticity), "Restitution = baseRestitution × √(elasticity₁ × elasticity₂)");
        row(grid, "Melanin enabled", g.melaninEnabled ? "on" : "off", "Melanin is a membrane pigment; toggle it in the Membrane organelle panel");
        row(grid, "Melanin", `${formatTwoDecimals(g.melaninPercent ?? 0)}%`, "MembraneOpacity = MembraneBaseOpacity + MelaninOpacityFactor × MelaninPercent");
        row(grid, "Membrane opacity", formatTwoDecimals(v.membraneColor.opacity), "MembraneOpacity = MembraneBaseOpacity + MelaninOpacityFactor × MelaninPercent");
        row(grid, "Transmittance", formatTwoDecimals(v.transmittance), "MembraneLightTransmittance = exp(−MembraneOpacity)");
        row(grid, "Start membrane damage", formatTwoDecimals(state.cellDraft.startMembraneDamage ?? 0), "StartMembraneDamage initializes membrane damage; it affects membrane health, repair load and visual health overlay after spawn");
        return;
    }
    if (scope === "chloroplast") {
        row(grid, "Enabled", g.chloroplastEnabled ? "on" : "off", "CpEnabled controls the presence of chloroplasts; use the organelle buttons to change it");
        row(grid, "Amount", formatTwoDecimals(g.chloroplastAmount ?? 0), "CpTotalArea = CpAmount × CpAreaFactor; more area captures light but increases mass/division cost");
        row(grid, "Chlorophyll", `${formatTwoDecimals(g.chlorophyll ?? 0)}%`, "PigmentOpticalDepth += CpCoverage × ChlorophyllAbsorbFactor × ChlorophyllPercent");
        row(grid, "Carotenoids", `${formatTwoDecimals(g.carotenoids ?? 0)}%`, "CarotProtection = 1 − exp(−CarotProtectionFactor × CarotPercent / ChlorPercent)");
        row(grid, "Start Cp damage", formatTwoDecimals(state.cellDraft.startCpDamage ?? 0), "StartCpDamage is applied when a cell is spawned from this draft");
        row(grid, "Light capture", formatTwoDecimals(v.lightCapture), "LightCapture = 1 − exp(−PigmentOpticalDepth)");
        return;
    }

    if (scope === "flagellum") {
        row(grid, "Mode", flagellumFieldSummary(g), "Flagellum mode is a discrete morphology: absent, one flagellum, or a symmetric pair");
        row(grid, "Count", String(v.flagellumCount), "Count is controlled by the flagellum mode buttons, not by a continuous slider");
        row(grid, "Length", `${formatTwoDecimals(g.flagellumLength ?? 0)} × R`, "ActualLength = CellRadius × Length; length increases hydrodynamic coupling, torque arm load, mass and damage exposure");
        row(grid, "Motor power", `${formatTwoDecimals(g.flagellumMotorPower ?? 0)}%`, "MotorPower sets active beating strength; actual force also depends on energy availability and damage");
        row(grid, "Placement", "Posterior", "Flagella are fixed as rear pushers to keep the model unambiguous");
        const spreadLabel = (g.flagellumEnabled && (g.flagellumCount ?? 1) >= 2)
            ? `${Math.round(Number(g.flagellumPairSpreadAngle ?? 0) || 0)}°`
            : "inactive for single flagellum";
        row(grid, "Pair spread angle", spreadLabel, "Only paired flagella use PairSpread; root thickness is included automatically, so 0 means the bases just touch");
        row(grid, "Steering asymmetry", `${Math.round(Number(g.flagellumSteeringAsymmetry ?? 0) || 0)}%`, "The slider uses a logarithmic response around zero; one flagellum bends thrust, two flagella bias left/right motor power");
        row(grid, "Start flagella damage", formatTwoDecimals(state.cellDraft.startFlagellumDamage ?? 0), "Initial damage is copied to every generated flagellum slot at spawn; current runtime sources do not add motor or collision damage");
        row(grid, "Energy cost", formatTwoDecimals(v.flagellumEnergyCost), "EnergyCostRate = FlagellumEnergyCostFactor × hydrodynamicPower; hydrodynamicPower ≈ |Force| × |Force| / translationalDrag");
        row(grid, "Expected force", formatTwoDecimals(v.flagellumThrust), "Low-Reynolds approximation: flagellar beating creates an effective force balanced by viscous drag");
        return;
    }

    if (scope === "lysosome") {
        row(grid, "Enabled", g.lysosomeEnabled ? "on" : "off", "LysosomeEnabled controls food capture and digestion; use the organelle buttons to change it");
        row(grid, "Amount", formatTwoDecimals(g.lysosomeAmount ?? 0), "LysosomeCapacity = LysosomeAmount; each lysosome holds one food piece");
        row(grid, "Enzyme activity", `${formatTwoDecimals(g.lysosomeEnzymeActivity ?? 0)}%`, "DigestRate = DigestRateFactor × (0.40 + 0.60 × EnzymeActivity); higher values digest faster but cost and damage more");
        row(grid, "Start lysosome damage", formatTwoDecimals(state.cellDraft.startLysosomeDamage ?? 0), "Initial Damage is copied to every lysosome slot at spawn");
        row(grid, "Food capacity", String(v.lysosomeCapacity), "FoodCapacity = active lysosome count; each lysosome holds one captured food piece");
        row(grid, "Digest rate", formatTwoDecimals(v.lysosomeDigestRate), "DigestRate = DigestRateFactor × LysosomeAmount × (0.40 + 0.60 × EnzymeActivity)");
        row(grid, "Net yield", `${formatTwoDecimals(v.lysosomeNetYield * 100)}%`, "Healthy lysosomes transfer food energy at 100% gross efficiency; digestion cost is separate");
        row(grid, "Leak risk", `${formatTwoDecimals(v.lysosomeLeakRisk * 100)}%`, "Leak risk follows the shared organelle leak formula from current lysosome damage above the leak threshold");
        return;
    }

    rowPair(
        grid,
        "Energy",
        formatTwoDecimals(v.energy),
        "CurrentEnergy = initial stored reserve after spawn clamps it to MaxEnergy",
        formatTwoDecimals(v.maxEnergy),
        "MaxEnergy = CytosolArea × EnergyCapacityPerArea"
    );
    rowPair(
        grid,
        "Mass",
        formatTwoDecimals(v.mass),
        "CurrentMass = DryMass + EnergyMass; runtime physics uses this value",
        formatTwoDecimals(v.dryMass),
        "DryMass = structural organelle mass without stored-energy mass"
    );
    row(grid, "Density", formatTwoDecimals(v.density), "CellDensity = CellMass / CellArea; values below medium density float upward");
    row(grid, "Cytosol area", formatTwoDecimals(g.cytosolArea), "MaxEnergy is derived from cytosol area, not edited directly");
    row(grid, "Cytosol opacity", formatTwoDecimals(v.cytosolColor.opacity), "CytosolOpacity is calculated from cytosol pigment depth; membrane opacity is shown separately");
    row(grid, "Membrane opacity", formatTwoDecimals(v.membraneColor.opacity), "MembraneOpacity = MembraneBaseOpacity + MembraneMelaninOpacityFactor × MelaninPercent");
    row(grid, "Bioluminescence enabled", g.bioluminescenceEnabled ? "on" : "off", "Bioluminescence is an optional cytosol parameter and can mutate on/off like optional organelles");
    row(grid, "Bioluminescence", formatTwoDecimals(g.bioluminescence ?? 0), "Bioluminescence is localized in cytosol and displayed as internal cytosol glow when enabled");
    row(grid, "Start cytosol damage", formatTwoDecimals(state.cellDraft.startCytosolDamage ?? 0), "Initial cytosol damage; high cytosol damage can kill the cell");
    row(grid, "Start membrane damage", formatTwoDecimals(state.cellDraft.startMembraneDamage ?? 0), "Initial membrane damage");
    row(grid, "Start chloroplast damage", formatTwoDecimals(state.cellDraft.startCpDamage ?? 0), "Initial chloroplast damage");
    row(grid, "Start lysosome damage", formatTwoDecimals(state.cellDraft.startLysosomeDamage ?? 0), "Initial damage applied to all lysosome slots");
    row(grid, "Start flagella damage", formatTwoDecimals(state.cellDraft.startFlagellumDamage ?? 0), "Initial damage applied to all flagellum slots");
    row(grid, "Lysosome capacity", String(v.lysosomeCapacity), "Cells without lysosomes do not capture or digest food");
    row(grid, "Cytosol color", `${v.cytosolColor.r}, ${v.cytosolColor.g}, ${v.cytosolColor.b} / ${formatTwoDecimals(v.cytosolColor.opacity)}`, "CytosolColor is the former Cell Color and does not include membrane color");
}


function flagellumFieldSummary(genome) {
    const enabled = Boolean(genome.flagellumEnabled);
    const count = enabled ? Math.max(1, Math.min(2, Math.round(genome.flagellumCount ?? 1))) : 0;
    if (count <= 0) return "off";
    const motor = Number(genome.flagellumMotorPower ?? 0);
    const steering = Number(genome.flagellumSteeringAsymmetry ?? 0);
    const mode = count >= 2 ? "pair" : "one";
    return `${mode}, posterior pusher, ${formatTwoDecimals(motor)}% motor, ${Math.round(steering)}% steering`;
}

function syncOrganellePanelReadouts(v) {
    setPanelTooltipValue("createNucleusDivisionCost", formatTwoDecimals(v.divCost), "CellDivEnergyCost = ImpulseCost + nucleus/cytosol/membrane/chloroplast division costs");
    setPanelTooltipValue("createNucleusStartDamage", formatTwoDecimals(state.cellDraft?.startNucleusDamage ?? 0), "StartNucleusDamage is applied when a cell is spawned from this draft");
    setPanelTooltipValue("createNucleusFormula", "threshold / impulse / angle", "DivisionAxis = CellAngle + NcDivAngle; CellDivEnergyThreshold = MaxEnergy × DivisionThreshold%");

    setPanelTooltipValue("createCytosolBioluminescenceCost", formatTwoDecimals(v.bioluminescenceCost), "BioluminescenceEnergyConsumption = BioluminescenceExpression × CytosolBioluminescenceConsumptionFactor");
    setPanelTooltipValue("createCytosolColor", `${v.cytosolColor.r}, ${v.cytosolColor.g}, ${v.cytosolColor.b}`, "CytosolColor is tinted by organelles and CytosolDamage, but not by membrane color");

    setPanelTooltipValue("createMembraneOpacity", formatTwoDecimals(v.membraneColor.opacity), "MembraneOpacity = MembraneBaseOpacity + MelaninOpacityFactor × MelaninPercent");
    setPanelTooltipValue("createMembraneTransmittance", formatTwoDecimals(v.transmittance), "MembraneLightTransmittance = exp(−MembraneOpacity)");
    setPanelTooltipValue("createMembraneStartDamage", formatTwoDecimals(state.cellDraft?.startMembraneDamage ?? 0), "StartMembraneDamage initializes membrane damage");

    setPanelTooltipValue("createChloroplastLightCapture", formatTwoDecimals(v.lightCapture), "LightCapture = 1 − exp(−PigmentOpticalDepth)");
    setPanelTooltipValue("createChloroplastProtection", formatTwoDecimals(v.protection), "CarotProtection = 1 − exp(−CarotProtectionFactor × CarotPercent / ChlorPercent)");
    setPanelTooltipValue("createChloroplastStartDamage", formatTwoDecimals(state.cellDraft?.startCpDamage ?? 0), "StartCpDamage is applied when a cell is spawned from this draft");

    setPanelTooltipValue("createLysosomeCapacity", String(v.lysosomeCapacity), "FoodCapacity = active lysosome count");
    setPanelTooltipValue("createLysosomeDigestRate", formatTwoDecimals(v.lysosomeDigestRate), "DigestRate = DigestRateFactor × LysosomeAmount × (0.40 + 0.60 × EnzymeActivity)");
    setPanelTooltipValue("createLysosomeNetYield", `${formatTwoDecimals(v.lysosomeNetYield * 100)}%`, "Food energy transfer is 100% gross at zero damage; digestion cost is separate");
    setPanelTooltipValue("createLysosomeLeakRisk", `${formatTwoDecimals(v.lysosomeLeakRisk * 100)}%`, "LeakRisk follows the shared organelle leak formula from current lysosome damage above the leak threshold");
    setPanelTooltipValue("createLysosomeStartDamage", formatTwoDecimals(state.cellDraft?.startLysosomeDamage ?? 0), "StartLysosomeDamage initializes each lysosome slot");

    setPanelTooltipValue("createFlagellumSummary", flagellumFieldSummary(state.cellDraft?.genome ?? {}), "Posterior pusher morphology with one flagellum or a symmetric pair");
    setPanelTooltipValue("createFlagellumEnergyCost", formatTwoDecimals(v.flagellumEnergyCost), "EnergyCostRate = FlagellumEnergyCostFactor × hydrodynamicPower; hydrodynamicPower ≈ |Force|² / translationalDrag");
    setPanelTooltipValue("createFlagellumThrust", formatTwoDecimals(v.flagellumThrust), "Effective low-Reynolds thrust from motor power, length and active flagellum count");
    setPanelTooltipValue("createFlagellumFormulaInfo", "posterior pusher", "Length = R×Length; visible root width is derived from length with a configurable non-linear response; PairSpread adds spacing after root thickness; Force = Σ Direction×Motor×Length; Torque = Σ base×force");
}

function setPanelTooltipValue(id, value, tooltip) {
    const el = document.getElementById(id);
    if (!el) return;
    setTooltipValue(el, t(String(value)), t(tooltip));
}

function rowPair(grid, label, leftValue, leftTooltip, rightValue, rightTooltip) {
    const labelEl = document.createElement("div");
    labelEl.className = "cell-info-label";
    labelEl.textContent = t(label);
    const valueEl = document.createElement("div");
    grid.append(labelEl, valueEl);
    setTooltipPairValue(valueEl, t(String(leftValue)), t(leftTooltip), t(String(rightValue)), t(rightTooltip));
}

function row(grid, label, value, tooltip) {
    const labelEl = document.createElement("div");
    labelEl.className = "cell-info-label";
    labelEl.textContent = t(label);
    const valueEl = document.createElement("div");
    grid.append(labelEl, valueEl);
    setTooltipValue(valueEl, t(String(value)), t(tooltip));
}

function _syncInfoPane() {
    syncCreateInfoPanel();
}

function _previewValues(g) {
    const chlorEnabled = Boolean(g.chloroplastEnabled);
    const lysosomeEnabled = Boolean(g.lysosomeEnabled);
    const melanin = Boolean(g.melaninEnabled) ? _clamp01((g.melaninPercent ?? 0) / 100) : 0;
    const chlor = chlorEnabled ? Math.max(0.15, _clamp01((g.chlorophyll ?? 0) / 100)) : 0;
    const carot = chlorEnabled ? _clamp01((g.carotenoids ?? 0) / 100) : 0;
    const lysosomeEnzyme01 = _clamp01((g.lysosomeEnzymeActivity ?? 0) / 100);
    const amount = chlorEnabled ? Math.max(0, Math.round(g.chloroplastAmount ?? 0)) : 0;
    const lysosomeAmount = lysosomeEnabled ? Math.max(0, Math.round(g.lysosomeAmount ?? 0)) : 0;
    const flagellumEnabled = Boolean(g.flagellumEnabled);
    const flagellumCount = flagellumEnabled ? Math.max(1, Math.min(2, Math.round(g.flagellumCount ?? 1))) : 0;
    const flagellumLengthFactor = normalizeFlagellumLengthValue(g.flagellumLength ?? 1.8);
    const flagellumActivity01 = _clamp01((g.flagellumMotorPower ?? 30) / 100);
    const flagellumThicknessFactor = 1.0;
    const metrics = currentCreatePreviewMetrics({allowStale: true});
    const cpArea = Number.isFinite(Number(metrics?.chloroplastArea)) ? Number(metrics.chloroplastArea) : amount * 4;
    const lysosomeArea = Number.isFinite(Number(metrics?.lysosomeArea)) ? Number(metrics.lysosomeArea) : lysosomeAmount * 4.7;
    const cellArea = Number.isFinite(Number(metrics?.cellArea))
        ? Number(metrics.cellArea)
        : 18 + Math.max(0, g.cytosolArea ?? 0) * 0.58 + cpArea + lysosomeArea;
    const radius = Number.isFinite(Number(metrics?.radius)) ? Number(metrics.radius) : Math.max(6, Math.sqrt(cellArea / Math.PI));
    const coverage = _clamp01(cpArea / Math.max(cellArea, 1.0));
    const pigmentDepth = coverage * (2.4 * chlor + 0.42 * carot);
    const lightCapture = Number.isFinite(Number(metrics?.lightCapture)) ? Number(metrics.lightCapture) : (chlorEnabled ? 1 - Math.exp(-pigmentDepth) : 0);
    const membraneOpacity = Number.isFinite(Number(metrics?.membraneOpacity)) ? _clamp01(Number(metrics.membraneOpacity)) : _clamp01(0.095 + 0.42 * melanin);
    const cytosolOpacity = _clamp01(0.12 + 0.22 * (1 - Math.exp(-pigmentDepth)));
    const pigmentPresence = Math.max(chlor, carot);
    const chlorophyllColor = _mixRgb({r:154,g:210,b:82}, {r:28,g:96,b:40}, _clamp01((chlor - 0.15) / 0.85));
    const chloroplastColor = _mixWeighted(chlorophyllColor, Math.max(0.001, chlor), {r:128,g:72,b:32}, carot, {r:238,g:240,b:232}, 0);
    const lysosomeCoverage = _clamp01(lysosomeArea / Math.max(cellArea, 1.0));
    const lysosomeColor = _lysosomeAcidColor(lysosomeEnzyme01);
    const cytosolBaseColor = _mixWeighted4(
        {r:238,g:240,b:232}, 1,
        chloroplastColor, coverage * (0.80 + 0.70 * pigmentPresence),
        lysosomeColor, lysosomeCoverage * (0.35 + 0.65 * lysosomeEnzyme01),
        {r:104,g:98,b:86}, 0
    );
    const membraneLength = Number.isFinite(Number(metrics?.membraneLength)) ? Number(metrics.membraneLength) : 2 * Math.PI * radius;
    const flagellumMass = Number.isFinite(Number(metrics?.flagellumMass)) ? Number(metrics.flagellumMass) : flagellumCount * 0.75 * flagellumLengthFactor * flagellumThicknessFactor * 1.05;
    const cytosolMass = Number.isFinite(Number(metrics?.cytosolMass))
        ? Number(metrics.cytosolMass)
        : Math.max(0, g.cytosolDensity ?? 0) * Math.max(0, g.cytosolArea ?? 0) * 0.58;
    const mass = Number.isFinite(Number(metrics?.mass))
        ? Number(metrics.mass)
        : 18 * 1.10 + cytosolMass + amount * 4 * 1.15 + lysosomeAmount * 4.7 * 1.10 + flagellumMass + membraneLength * 0.32 * 1.05 * (1 + melanin);
    const energy = Number.isFinite(Number(metrics?.energy)) ? Number(metrics.energy) : 0;
    const maxEnergy = Number.isFinite(Number(metrics?.maxEnergy)) ? Number(metrics.maxEnergy) : Math.max(0, Number(g.cytosolArea ?? 0) || 0) * 0.72;
    const dryMass = Number.isFinite(Number(metrics?.dryMass)) ? Number(metrics.dryMass) : Math.max(0, mass);
    const lysosomeDigestRate = lysosomeEnabled ? 0.22 * lysosomeAmount * (0.40 + 0.60 * lysosomeEnzyme01) : 0;
    const grossYield = 1.0;
    const digestCostShare = 0.085 * (0.35 + 1.65 * lysosomeEnzyme01 * lysosomeEnzyme01);
    const lysosomeNetYield = lysosomeEnabled ? _clamp01(grossYield - digestCostShare) : 0;
    const lysosomeStartDamage = _clamp01(Number(state.cellDraft?.startLysosomeDamage ?? 0) || 0);
    const lysosomeLeakExcess = Math.max(0, lysosomeStartDamage - 0.55);
    const lysosomeLeakRisk = lysosomeEnabled ? _clamp01(0.006 * lysosomeLeakExcess * (1.0 + lysosomeLeakExcess) * (0.35 + 0.65 * lysosomeEnzyme01)) : 0;
    const lysosomeMaintenance = lysosomeAmount * 0.006 * (0.84 + 0.16 * lysosomeEnzyme01);
    const divCost = Number.isFinite(Number(metrics?.divisionEnergyCost))
        ? Number(metrics.divisionEnergyCost)
        : Math.pow(g.divisionImpulse ?? 0, 2) / Math.max(2 * mass, 1.0)
            + 5
            + cytosolMass * 0.02
            + membraneLength * 0.025
            + amount * 0.12
            + lysosomeAmount * 0.09 * (0.80 + 0.20 * lysosomeEnzyme01)
            + flagellumMass * 0.05;
    const protection = Number.isFinite(Number(metrics?.carotProtection)) ? _clamp01(Number(metrics.carotProtection)) : (chlorEnabled ? _clamp01(1 - Math.exp(-2.8 * carot / Math.max(chlor, 0.000001))) : 0);
    const membraneColor = _mixRgb({r:238,g:240,b:232}, {r:65,g:43,b:30}, melanin);
    const bioluminescence01 = g.bioluminescenceEnabled ? _clamp01((g.bioluminescence ?? 0) / 100) : 0;
    const bioluminescenceCost = bioluminescence01 * 0.04;
    const cytosolColor = {...cytosolBaseColor, opacity: cytosolOpacity};
    const flagellumThrust = flagellumCount * 0.045 * radius * radius * flagellumActivity01 * flagellumLengthFactor;
    const translationalDrag = 6 * Math.PI * Math.max(radius, 1.0e-9);
    const flagellumEnergyCost = 0.018 * Math.abs(flagellumThrust) * (Math.abs(flagellumThrust) / Math.max(translationalDrag, 1.0e-9));
    return {
        energy,
        maxEnergy,
        mass,
        dryMass,
        density: Number.isFinite(Number(metrics?.density)) ? Number(metrics.density) : mass / Math.max(cellArea, 1.0e-9),
        divCost,
        membraneColor: {...membraneColor, opacity: membraneOpacity},
        cytosolColor,
        cellColor: {...cytosolBaseColor, opacity: cytosolOpacity},
        transmittance: Number.isFinite(Number(metrics?.membraneTransmittance)) ? Number(metrics.membraneTransmittance) : Math.exp(-membraneOpacity),
        lightCapture,
        protection,
        bioluminescenceCost,
        lysosomeCapacity: Number.isFinite(Number(metrics?.lysosomeCapacity)) ? Number(metrics.lysosomeCapacity) : lysosomeAmount,
        lysosomeDigestRate,
        lysosomeNetYield,
        lysosomeLeakRisk,
        lysosomeMaintenance,
        flagellumCount,
        flagellumAverageMotor: flagellumActivity01 * 100,
        flagellumEnergyCost,
        flagellumThrust,
    };
}

function _mixRgb(a, b, t) {
    const safeT = _clamp01(t);
    return {
        r: Math.round(a.r + (b.r - a.r) * safeT),
        g: Math.round(a.g + (b.g - a.g) * safeT),
        b: Math.round(a.b + (b.b - a.b) * safeT),
    };
}

function _mixWeighted(a, aw, b, bw, c, cw) {
    const sum = Math.max(0.001, aw + bw + cw);
    return {
        r: Math.round((a.r * aw + b.r * bw + c.r * cw) / sum),
        g: Math.round((a.g * aw + b.g * bw + c.g * cw) / sum),
        b: Math.round((a.b * aw + b.b * bw + c.b * cw) / sum),
    };
}

function _mixWeighted4(a, aw, b, bw, c, cw, d, dw) {
    const sum = Math.max(0.001, aw + bw + cw + dw);
    return {
        r: Math.round((a.r * aw + b.r * bw + c.r * cw + d.r * dw) / sum),
        g: Math.round((a.g * aw + b.g * bw + c.g * cw + d.g * dw) / sum),
        b: Math.round((a.b * aw + b.b * bw + c.b * cw + d.b * dw) / sum),
    };
}


function normalizeFlagellumGeometry(genome, changedKey = null) {
    if (!genome) return genome;
    genome.flagellumCount = Math.max(1, Math.min(2, Math.round(Number(genome.flagellumCount ?? 1) || 1)));
    genome.flagellumLength = roundToGenomeStep("flagellumLength", _clampGenomeValue("flagellumLength", normalizeFlagellumLengthValue(genome.flagellumLength ?? 1.8)));

    const pairEnabled = Boolean(genome.flagellumEnabled) && genome.flagellumCount >= 2;
    for (const key of [
        "flagellumMotorPower",
        "flagellumSteeringAsymmetry",
    ]) {
        const raw = Number(genome[key] ?? state.config?.initialGenome?.[key]?.value ?? 0);
        genome[key] = roundToGenomeStep(key, _clampGenomeValue(key, Number.isFinite(raw) ? raw : 0));
    }

    const rawSpread = Number(genome.flagellumPairSpreadAngle ?? state.config?.initialGenome?.flagellumPairSpreadAngle?.value ?? 36);
    const clampedSpread = _clampGenomeValue("flagellumPairSpreadAngle", Number.isFinite(rawSpread) ? rawSpread : 36);
    genome.flagellumPairSpreadAngle = roundToGenomeStep("flagellumPairSpreadAngle", clampedSpread);
    return genome;
}

function normalizeFlagellumLengthValue(value) {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return 1.8;
    // Backward compatibility: old saved genomes used percent-like length values.
    if (raw > 5) return 1.0 + 3.0 * _clamp01(raw / 100);
    return raw;
}

function flagellumVisualRootWidthFromLength(lengthFactor, count = 1) {
    const t = _clamp01((Number(lengthFactor) - 1.0) / 3.0);
    const base = 0.112 - (0.112 - 0.050) * Math.pow(t, 0.82);
    return Math.max(0.045, base * (Number(count) >= 2 ? 0.92 : 1.0));
}

function _applyGenomeInputRanges() {
    for (const { key, range, input, valueFromRange } of [...getCreateCellFields(), ...getCreateDebugFields()]) {
        const b = state.config?.initialGenome?.[key];
        if (!b) { console.warn("Missing genome range:", key); continue; }
        applyInputBounds(range, typeof valueFromRange === "function" ? sliderBoundsForControl(b) : b);
        applyInputBounds(input, b);
    }
    syncFlagellumDynamicBounds();
}

function syncFlagellumDynamicBounds(genome = state.cellDraft?.genome) {
    if (!genome) return genome;
    const pairEnabled = Boolean(genome.flagellumEnabled) && Math.round(Number(genome.flagellumCount ?? 1)) >= 2;
    const b = state.config?.initialGenome?.flagellumPairSpreadAngle;
    const minSpread = Number(b?.min ?? 0);
    const maxSpread = Number(b?.max ?? 180);
    const step = Number(b?.step ?? 1);
    if (dom.createFlagellumPairSpreadAngleSlider) {
        dom.createFlagellumPairSpreadAngleSlider.min = String(minSpread);
        dom.createFlagellumPairSpreadAngleSlider.max = String(maxSpread);
        dom.createFlagellumPairSpreadAngleSlider.step = String(step);
        dom.createFlagellumPairSpreadAngleSlider.disabled = !pairEnabled;
    }
    if (dom.createFlagellumPairSpreadAngleInput) {
        dom.createFlagellumPairSpreadAngleInput.min = String(minSpread);
        dom.createFlagellumPairSpreadAngleInput.max = String(maxSpread);
        dom.createFlagellumPairSpreadAngleInput.step = String(step);
        dom.createFlagellumPairSpreadAngleInput.disabled = !pairEnabled;
        dom.createFlagellumPairSpreadAngleInput.title = pairEnabled
            ? t("Pair spread adds extra spacing after the rendered root thickness is accounted for, and keeps the roots inside the membrane at the maximum value")
            : t("Pair spread is used only for two flagella");
    }
    return genome;
}

function roundToGenomeStep(key, value) {
    const control = state.config?.initialGenome?.[key];
    if (!control) return value;
    return roundControlValue(value, control);
}

function normalizeRadians(value) {
    const twoPi = Math.PI * 2;
    const result = Number(value) % twoPi;
    return result < 0 ? result + twoPi : result;
}

function lerpAngle(a, b, t) {
    let delta = ((b - a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (delta > Math.PI) delta -= Math.PI * 2;
    return a + delta * _clamp01(t);
}

function _clampGenomeValue(key, value) {
    const b = state.config?.initialGenome?.[key];
    if (!b) return value;
    return Math.max(Number(b.min), Math.min(Number(b.max), value));
}

function _clampDebugValue(key, value) {
    const b = state.config?.initialGenome?.[key];
    if (!b) return value;
    return Math.max(Number(b.min), Math.min(Number(b.max), value));
}

function _clamp01(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}



function _smoothstep(value) {
    const t = _clamp01(value);
    return t * t * (3 - 2 * t);
}

function _lysosomeAcidColor(enzyme01) {
    const activity = _clamp01((_clamp01(enzyme01) - 0.15) / 0.85);
    const low = {r: 92, g: 28, b: 43};
    const mid = {r: 154, g: 34, b: 43};
    const high = {r: 232, g: 48, b: 37};
    if (activity < 0.5) return _mixRgb(low, mid, activity / 0.5);
    return _mixRgb(mid, high, (activity - 0.5) / 0.5);
}
