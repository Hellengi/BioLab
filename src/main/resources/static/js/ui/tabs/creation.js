/**
 * ui/tabs/creation.js
 */

import { dom } from "../dom.js";
import { state } from "../../store/state.js";
import { drawCreateCellPreview } from "../../render/preview.js";
import { loadSimulationConfig } from "../../store/actions.js";
import { applyInputBounds } from "../panels/_panels.js";
import { spawnCell } from "../../transport/api/cell.js";
import { formatTwoDecimals, setText } from "../../core/utils.js";
import { clearTooltipElement, setTooltipValue } from "../cell-info.js";
import {
    initOrganellePanels,
    chloroplastEnabled as _getChloroplastEnabled,
    lysosomeEnabled as _getLysosomeEnabled,
    melaninEnabled as _getMelaninEnabled,
    setChloroplastEnabled,
    setLysosomeEnabled,
    setMelaninEnabled,
    openOrganellePanel,
} from "./creation-organelle.js";

export function getCreateCellFields() {
    return [
        { key: "divisionThreshold", range: dom.createDivisionThresholdSlider, input: dom.createDivisionThresholdInput },
        { key: "divisionImpulse",   range: dom.createDivisionImpulseSlider,   input: dom.createDivisionImpulseInput },
        { key: "divisionAngle",     range: dom.createDivisionAngleSlider,     input: dom.createDivisionAngleInput },
        { key: "maxEnergy",         range: dom.createMaxEnergySlider,         input: dom.createMaxEnergyInput },
        { key: "dryMass",           range: dom.createDryMassSlider,           input: dom.createDryMassInput },
        { key: "elasticity",        range: dom.createElasticitySlider,        input: dom.createElasticityInput },
        { key: "gfp",               range: dom.createGfpSlider,               input: dom.createGfpInput },
        { key: "melaninPercent",    range: dom.createMelaninPercentSlider,    input: dom.createMelaninPercentInput },
        { key: "chloroplastAmount", range: dom.createChloroplastAmountSlider, input: dom.createChloroplastAmountInput },
        { key: "chlorophyll",       range: dom.createChlorophyllSlider,       input: dom.createChlorophyllInput },
        { key: "carotenoids",       range: dom.createCarotenoidsSlider,       input: dom.createCarotenoidsInput },
        { key: "lysosomeAmount",    range: dom.createLysosomeAmountSlider,    input: dom.createLysosomeAmountInput },
        { key: "lysosomeEnzymeActivity", range: dom.createLysosomeEnzymeActivitySlider, input: dom.createLysosomeEnzymeActivityInput },
    ];
}

export function getCreateDebugFields() {
    return [
        { key: "startCellDamage", range: dom.createStartCellDamageSlider, input: dom.createStartCellDamageInput },
        { key: "startCpDamage",   range: dom.createStartCpDamageSlider,   input: dom.createStartCpDamageInput },
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
    setChloroplastEnabled(Boolean(state.config.initialGenome.chloroplastEnabled));
    setLysosomeEnabled(Boolean(state.config.initialGenome.lysosomeEnabled));
    setMelaninEnabled(Boolean(state.config.initialGenome.melaninEnabled));
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
    genome.melaninEnabled = Boolean(state.config.initialGenome.melaninEnabled);

    return {
        id: null,
        name: null,
        genome,
        startCellDamage: state.config.initialGenome?.startCellDamage?.value ?? 0,
        startCpDamage: state.config.initialGenome?.startCpDamage?.value ?? 0,
    };
}

export function syncDraftToForm() {
    if (!state.cellDraft?.genome) return;

    for (const { key, range, input } of getCreateCellFields()) {
        const value = state.cellDraft.genome[key] ?? state.config?.initialGenome?.[key]?.value ?? 0;
        state.cellDraft.genome[key] = value;
        const v = String(value);
        if (range) range.value = v;
        if (input) input.value = v;
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
    setMelaninEnabled(Boolean(state.cellDraft.genome.melaninEnabled));
    if (dom.melaninEnabled) dom.melaninEnabled.checked = Boolean(state.cellDraft.genome.melaninEnabled);

    syncCreateInfoPanel();
    drawCreateCellPreview();
}

export function readDraftFromForm() {
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
    draft.genome.melaninEnabled = _getMelaninEnabled;
    return draft;
}

export function onCreateFormChange() {
    if (!state.cellDraft) return;
    state.cellDraft = readDraftFromForm();
    syncCreateInfoPanel();
    drawCreateCellPreview();
}

export async function toggleCellPlacement() {
    if (!state.cellDraft) await initCreatePanel();

    if (state.placeMode) {
        setPlaceMode(false);
    } else {
        state.cellDraft = readDraftFromForm();
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
        if (textEl) textEl.textContent = active ? "Placing ON" : "Placing OFF";
        hint.title = active ? "Placement mode ON" : "Placement mode off";
    }

    if (dom.placeCellModeBtn) {
        dom.placeCellModeBtn.classList.toggle("active", active);
        dom.placeCellModeBtn.title = active ? "Stop placing" : "Place on the field";
    }

    dom.canvas?.classList.toggle("cell-create-mode-active", active);
}

export async function spawnDraftCell(x, y) {
    if (!state.cellDraft) return;
    await spawnCell(x, y, state.cellDraft);
}

export async function ensureCreateCellPreviewReady() {
    if (!state.cellDraft) await initCreatePanel();
    syncCreateInfoPanel();
    requestAnimationFrame(() => drawCreateCellPreview());
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
        row(grid, "Division threshold", formatTwoDecimals(g.divisionThreshold), "CellDivEnergyThreshold = 2 × CellDivEnergyCost × NcDivThreshold / 50");
        row(grid, "Division impulse", formatTwoDecimals(g.divisionImpulse), "NcDivImpulseCost = NcDivImpulse² / (2 × CellMass)");
        row(grid, "Division angle", `${formatTwoDecimals(g.divisionAngle ?? 0)}°`, "DivisionAxis = CellAngle + NcDivAngle");
        row(grid, "Start cell damage", formatTwoDecimals(state.cellDraft.startCellDamage ?? 0), "StartCellDamage is applied when a cell is spawned from this draft");
        row(grid, "Division cost", formatTwoDecimals(v.divCost), "CellDivEnergyCost = ImpulseCost + organelle division costs");
        return;
    }
    if (scope === "cytosol") {
        row(grid, "Dry mass", formatTwoDecimals(g.dryMass), "CtMass = CtMassFactor × dryMass + Energy × EnergyToMassFactor");
        row(grid, "Max energy", formatTwoDecimals(g.maxEnergy), "CellEnergy is clamped by CytosolMaxEnergy");
        row(grid, "GFP", formatTwoDecimals(g.gfp ?? 0), "GfpEnergyConsumption = GfpExpression × CytosolGfpConsumptionFactor");
        row(grid, "Cytosol color", `${v.cytosolColor.r}, ${v.cytosolColor.g}, ${v.cytosolColor.b} / ${formatTwoDecimals(v.cytosolColor.opacity)}`, "CytosolColor = weighted(BaseCytosolColor, Nucleus/Chloroplast/Lysosome influence, CellDamage)");
        return;
    }
    if (scope === "membrane") {
        row(grid, "Elasticity", formatTwoDecimals(g.elasticity), "Restitution = baseRestitution × √(elasticity₁ × elasticity₂)");
        row(grid, "Melanin enabled", g.melaninEnabled ? "on" : "off", "Melanin is a membrane pigment; toggle it in the Membrane organelle panel");
        row(grid, "Melanin", `${formatTwoDecimals(g.melaninPercent ?? 0)}%`, "MembraneOpacity = MembraneBaseOpacity + MelaninOpacityFactor × MelaninPercent");
        row(grid, "Membrane opacity", formatTwoDecimals(v.membraneColor.opacity), "MembraneOpacity controls both membrane layer visibility and light transmittance");
        row(grid, "Transmittance", formatTwoDecimals(v.transmittance), "MembraneLightTransmittance = exp(−MembraneOpacity)");
        return;
    }
    if (scope === "chloroplast") {
        checkboxRow(grid, "Enabled", Boolean(g.chloroplastEnabled), "CpEnabled controls the presence of chloroplasts", checked => {
            setChloroplastEnabled(checked);
            state.cellDraft.genome.chloroplastEnabled = checked;
            onCreateFormChange();
        });
        row(grid, "Amount", formatTwoDecimals(g.chloroplastAmount ?? 0), "CpTotalArea = CpAmount × CpArea");
        row(grid, "Chlorophyll", `${formatTwoDecimals(g.chlorophyll ?? 0)}%`, "Chlorophyll increases green pigment and captured light");
        row(grid, "Carotenoids", `${formatTwoDecimals(g.carotenoids ?? 0)}%`, "CarotProtection = 1 − exp(−CarotProtectionFactor × CarotPercent / ChlorPercent)");
        row(grid, "Start Cp damage", formatTwoDecimals(state.cellDraft.startCpDamage ?? 0), "StartCpDamage is applied when a cell is spawned from this draft");
        row(grid, "Light capture", formatTwoDecimals(v.lightCapture), "LightCapture = 1 − exp(−PigmentOpticalDepth)");
        return;
    }

    if (scope === "lysosome") {
        checkboxRow(grid, "Enabled", Boolean(g.lysosomeEnabled), "LysosomeEnabled controls food capture and digestion", checked => {
            setLysosomeEnabled(checked);
            state.cellDraft.genome.lysosomeEnabled = checked;
            onCreateFormChange();
        });
        row(grid, "Amount", formatTwoDecimals(g.lysosomeAmount ?? 0), "LysosomeCapacity = LysosomeAmount; each lysosome holds one food piece");
        row(grid, "Enzyme activity", `${formatTwoDecimals(g.lysosomeEnzymeActivity ?? 0)}%`, "Higher activity digests faster, but costs more energy and increases damage risk");
        row(grid, "Food capacity", String(v.lysosomeCapacity), "FoodCapacity = active lysosome count");
        row(grid, "Digest rate", formatTwoDecimals(v.lysosomeDigestRate), "DigestRate = DigestRateFactor × LysosomeAmount × (0.40 + 0.60 × EnzymeActivity)");
        row(grid, "Net yield", `${formatTwoDecimals(v.lysosomeNetYield * 100)}%`, "Healthy lysosomes transfer food energy at 100% gross efficiency; digestion cost is separate");
        row(grid, "Leak risk", `${formatTwoDecimals(v.lysosomeLeakRisk * 100)}%`, "Leak risk rises with enzyme activity under active digestion and damage");
        return;
    }

    row(grid, "Mass", formatTwoDecimals(v.mass), "CellMass = NcMass + CtMass + MbMass + CpTotalMass + LyTotalMass");
    row(grid, "Max energy", formatTwoDecimals(g.maxEnergy), "CellEnergy <= MaxEnergy");
    row(grid, "Cytosol opacity", formatTwoDecimals(v.cytosolColor.opacity), "CytosolOpacity is calculated from cytosol pigment depth; membrane opacity is shown separately");
    row(grid, "Membrane opacity", formatTwoDecimals(v.membraneColor.opacity), "MembraneOpacity = MembraneBaseOpacity + MembraneMelaninOpacityFactor × MelaninPercent");
    row(grid, "GFP", formatTwoDecimals(g.gfp ?? 0), "GFP is localized in cytosol and displayed as internal cytosol glow");
    row(grid, "Start damage", formatTwoDecimals(state.cellDraft.startCellDamage ?? 0), "Debug starting CellDamage");
    row(grid, "Lysosome capacity", String(v.lysosomeCapacity), "Cells without lysosomes do not capture or digest food");
    row(grid, "Cytosol color", `${v.cytosolColor.r}, ${v.cytosolColor.g}, ${v.cytosolColor.b} / ${formatTwoDecimals(v.cytosolColor.opacity)}`, "CytosolColor is the former Cell Color and does not include membrane color");
}


function syncOrganellePanelReadouts(v) {
    setPanelTooltipValue("createNucleusDivisionCost", formatTwoDecimals(v.divCost), "CellDivEnergyCost = ImpulseCost + nucleus/cytosol/membrane/chloroplast division costs");
    setPanelTooltipValue("createNucleusStartDamage", formatTwoDecimals(state.cellDraft?.startCellDamage ?? 0), "StartCellDamage is applied when a cell is spawned from this draft");
    setPanelTooltipValue("createNucleusFormula", "threshold / impulse / angle", "DivisionAxis = CellAngle + NcDivAngle; CellDivEnergyThreshold = 2 × CellDivEnergyCost × NcDivThreshold / 50");

    setPanelTooltipValue("createCytosolGfpCost", formatTwoDecimals(v.gfpCost), "GfpEnergyConsumption = GfpExpression × CytosolGfpConsumptionFactor");
    setPanelTooltipValue("createCytosolColor", `${v.cytosolColor.r}, ${v.cytosolColor.g}, ${v.cytosolColor.b}`, "CytosolColor is tinted by organelles and CellDamage, but not by membrane color");

    setPanelTooltipValue("createMembraneOpacity", formatTwoDecimals(v.membraneColor.opacity), "MembraneOpacity controls membrane layer visibility and light transmittance");
    setPanelTooltipValue("createMembraneTransmittance", formatTwoDecimals(v.transmittance), "MembraneLightTransmittance = exp(−MembraneOpacity)");

    setPanelTooltipValue("createChloroplastLightCapture", formatTwoDecimals(v.lightCapture), "LightCapture = 1 − exp(−PigmentOpticalDepth)");
    setPanelTooltipValue("createChloroplastProtection", formatTwoDecimals(v.protection), "CarotProtection = 1 − exp(−CarotProtectionFactor × CarotPercent / ChlorPercent)");
    setPanelTooltipValue("createChloroplastStartDamage", formatTwoDecimals(state.cellDraft?.startCpDamage ?? 0), "StartCpDamage is applied when a cell is spawned from this draft");

    setPanelTooltipValue("createLysosomeCapacity", String(v.lysosomeCapacity), "FoodCapacity = active lysosome count");
    setPanelTooltipValue("createLysosomeDigestRate", formatTwoDecimals(v.lysosomeDigestRate), "DigestRate = DigestRateFactor × LysosomeAmount × (0.40 + 0.60 × EnzymeActivity)");
    setPanelTooltipValue("createLysosomeNetYield", `${formatTwoDecimals(v.lysosomeNetYield * 100)}%`, "Food energy transfer is 100% gross at zero damage; digestion cost is separate");
    setPanelTooltipValue("createLysosomeLeakRisk", `${formatTwoDecimals(v.lysosomeLeakRisk * 100)}%`, "LeakRisk rises with enzyme activity and active digestion load");
}

function setPanelTooltipValue(id, value, tooltip) {
    const el = document.getElementById(id);
    if (!el) return;
    setTooltipValue(el, value, tooltip);
}

function row(grid, label, value, tooltip) {
    const labelEl = document.createElement("div");
    labelEl.className = "cell-info-label";
    labelEl.textContent = label;
    const valueEl = document.createElement("div");
    grid.append(labelEl, valueEl);
    setTooltipValue(valueEl, value, tooltip);
}

function checkboxRow(grid, label, checked, tooltip, onChange) {
    const labelEl = document.createElement("div");
    labelEl.className = "cell-info-label";
    labelEl.textContent = label;
    const valueEl = document.createElement("div");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = checked;
    cb.addEventListener("change", () => onChange?.(cb.checked));
    valueEl.appendChild(cb);
    grid.append(labelEl, valueEl);
    setTooltipValue(valueEl, checked ? "on" : "off", tooltip);
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
    const cpArea = amount * 4;
    const lysosomeArea = lysosomeAmount * 4.7;
    const cellArea = 18 + Math.max(0, g.dryMass ?? 0) * 0.58 + lysosomeArea;
    const radius = Math.max(6, Math.sqrt(cellArea / Math.PI));
    const coverage = _clamp01(cpArea / Math.max(cellArea, 1.0));
    const pigmentDepth = coverage * (2.4 * chlor + 0.42 * carot);
    const lightCapture = chlorEnabled ? 1 - Math.exp(-pigmentDepth) : 0;
    const membraneOpacity = _clamp01(0.075 + 0.42 * melanin);
    const cytosolOpacity = _clamp01(0.12 + 0.22 * (1 - Math.exp(-pigmentDepth)));
    const pigmentPresence = Math.max(chlor, carot);
    const chlorophyllColor = _mixRgb({r:154,g:210,b:82}, {r:28,g:96,b:40}, _clamp01((chlor - 0.15) / 0.85));
    const chloroplastColor = _mixWeighted(chlorophyllColor, Math.max(0.001, chlor), {r:128,g:72,b:32}, carot, {r:238,g:240,b:232}, 0);
    const lysosomeCoverage = _clamp01(lysosomeArea / Math.max(cellArea, 1.0));
    const lysosomeColor = _lysosomeAcidColor(lysosomeEnzyme01);
    const cytosolBaseColor = _mixWeighted4(
        {r:200,g:194,b:170}, 1,
        chloroplastColor, coverage * (0.80 + 0.70 * pigmentPresence),
        lysosomeColor, lysosomeCoverage * (0.35 + 0.65 * lysosomeEnzyme01),
        {r:104,g:98,b:86}, 0
    );
    const membraneLength = 2 * Math.PI * radius;
    const mass = 45 + Math.max(0, g.dryMass ?? 0) + amount * 6 + lysosomeAmount * 4.5 + membraneLength * 2.2 * (1 + melanin);
    const lysosomeDigestRate = lysosomeEnabled ? 0.22 * lysosomeAmount * (0.40 + 0.60 * lysosomeEnzyme01) : 0;
    const grossYield = 1.0;
    const digestCostShare = 0.085 * (0.35 + 1.65 * lysosomeEnzyme01 * lysosomeEnzyme01);
    const lysosomeNetYield = lysosomeEnabled ? _clamp01(grossYield - digestCostShare) : 0;
    const lysosomeLeakRisk = lysosomeEnabled ? _clamp01((0.30 + 0.70 * lysosomeEnzyme01 * lysosomeEnzyme01) * 0.55) : 0;
    const lysosomeMaintenance = lysosomeAmount * 0.006 * (0.84 + 0.16 * lysosomeEnzyme01);
    const divCost = Math.pow(g.divisionImpulse ?? 0, 2) / Math.max(2 * mass, 1.0)
        + 5
        + Math.max(0, g.dryMass ?? 0) * 0.02
        + membraneLength * 0.025
        + amount * 0.12
        + lysosomeAmount * 0.09 * (0.80 + 0.20 * lysosomeEnzyme01);
    const protection = chlorEnabled ? _clamp01(1 - Math.exp(-2.8 * carot / Math.max(chlor, 0.000001))) : 0;
    const membraneColor = _mixRgb({r:206,g:197,b:172}, {r:65,g:43,b:30}, melanin);
    const gfp01 = _clamp01((g.gfp ?? 0) / 100);
    const gfpCost = gfp01 * Math.max(0, g.dryMass ?? 0) * 0.0009;
    const cytosolColor = {...cytosolBaseColor, opacity: cytosolOpacity};
    return {
        mass,
        divCost,
        membraneColor: {...membraneColor, opacity: membraneOpacity},
        cytosolColor,
        cellColor: {...cytosolBaseColor, opacity: cytosolOpacity},
        transmittance: Math.exp(-membraneOpacity),
        lightCapture,
        protection,
        gfpCost,
        lysosomeCapacity: lysosomeAmount,
        lysosomeDigestRate,
        lysosomeNetYield,
        lysosomeLeakRisk,
        lysosomeMaintenance,
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

function _applyGenomeInputRanges() {
    for (const { key, range, input } of [...getCreateCellFields(), ...getCreateDebugFields()]) {
        const b = state.config?.initialGenome?.[key];
        if (!b) { console.warn("Missing genome range:", key); continue; }
        applyInputBounds(range, b);
        applyInputBounds(input, b);
    }
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



