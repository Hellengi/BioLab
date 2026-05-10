import { state, loadSimulationConfig } from "../../store/store.js";
import { dom } from "../dom.js";
import { spawnCell } from "../../transport/api/cellsApi.js";
import { drawCreateCellPreview } from "../../render/preview.js";

export const createCellFields = [
    { key: "divisionThreshold", range: dom.createDivisionThresholdSlider, input: dom.createDivisionThresholdInput },
    { key: "divisionImpulse", range: dom.createDivisionImpulseSlider, input: dom.createDivisionImpulseInput },
    { key: "divisionAngle", range: dom.createDivisionAngleSlider, input: dom.createDivisionAngleInput },
    { key: "colorHue", range: dom.createColorHueSlider, input: dom.createColorHueInput },
    { key: "saturation", range: dom.createSaturationSlider, input: dom.createSaturationInput },
    { key: "lightness", range: dom.createLightnessSlider, input: dom.createLightnessInput },
    { key: "maxEnergy", range: dom.createMaxEnergySlider, input: dom.createMaxEnergyInput },
    { key: "dryMass", range: dom.createDryMassSlider, input: dom.createDryMassInput },
    { key: "elasticity", range: dom.createElasticitySlider, input: dom.createElasticityInput },
];

export const createMotionFields = [
    { key: "initialSpeed", configKey: "initialCellSpeed", range: dom.createInitialSpeedSlider, input: dom.createInitialSpeedInput },
    { key: "initialDirection", configKey: "initialCellDirection", range: dom.createInitialDirectionSlider, input: dom.createInitialDirectionInput },
];

export async function initCreatePanel() {
    if (!state.config) {
        await loadSimulationConfig();
    }
    resetCreatePanelFromConfig();
}

export function resetCreatePanelFromConfig() {
    applyGenomeInputRanges();
    applyMotionInputRanges();
    state.cellDraft = createDraft();
    syncDraftForm();
    setPlaceMode(false);
}

export function toggleCellPlacement() {
    if (state.placeMode) {
        setPlaceMode(false);
    } else {
        state.cellDraft = readDraftForm();
        drawCreateCellPreview();
        setPlaceMode(true);
    }
}

export function onCreateFormChange() {
    updateDraft();
}

export function createDraft() {
    if (!state.config?.initialGenome) {
        throw new Error("Simulation config is not loaded");
    }

    return {
        id: null,
        name: null,
        genome: {
            divisionThreshold: state.config.initialGenome.divisionThreshold.value,
            divisionImpulse: state.config.initialGenome.divisionImpulse.value,
            divisionAngle: state.config.initialGenome.divisionAngle.value,
            colorHue: state.config.initialGenome.colorHue.value,
            saturation: state.config.initialGenome.saturation.value,
            lightness: state.config.initialGenome.lightness.value,
            maxEnergy: state.config.initialGenome.maxEnergy.value,
            dryMass: state.config.initialGenome.dryMass.value,
            elasticity: state.config.initialGenome.elasticity.value,
            code: state.config.initialGenome.code,
        },
        initialSpeed: state.config.initialCellSpeed.initial,
        initialDirection: state.config.initialCellDirection.initial,
    };
}

export function syncDraftForm() {
    if (!state.cellDraft?.genome) return;

    for (const { key, range, input } of createCellFields) {
        const value = String(state.cellDraft.genome[key]);
        if (range) range.value = value;
        if (input) input.value = value;
    }

    for (const { key, range, input } of createMotionFields) {
        const value = String(state.cellDraft[key] ?? 0);
        if (range) range.value = value;
        if (input) input.value = value;
    }

    drawCreateCellPreview();
}

export function readDraftForm() {
    const draft = { id: null, name: null, genome: {} };

    for (const { key, input } of createCellFields) {
        const rawValue = Number(input?.value);

        if (!Number.isFinite(rawValue)) {
            throw new Error(`Invalid value for ${key}`);
        }

        draft.genome[key] = clampGenomeValue(key, rawValue);
    }

    draft.initialSpeed = clampMotionValue(
        "initialSpeed",
        Number(dom.createInitialSpeedInput?.value ?? state.config.initialCellSpeed.initial)
    );
    draft.initialDirection = wrapAngle(
        Number(dom.createInitialDirectionInput?.value ?? state.config.initialCellDirection.initial)
    );

    return draft;
}

export function updateDraft() {
    state.cellDraft = readDraftForm();
    drawCreateCellPreview();
}

export function setPlaceMode(value) {
    state.placeMode = value;

    const hint = dom.createCellModeHint;
    if (hint) {
        hint.textContent = value
            ? "Placement mode is ON — click on the field"
            : "Placement mode is off";
        hint.className = value
            ? "placement-hint placement-hint--on"
            : "placement-hint placement-hint--off";

        const dot = document.createElement("span");
        dot.className = "placement-dot";
        hint.prepend(dot);
    }

    if (dom.placeCellModeBtn) {
        dom.placeCellModeBtn.textContent = value ? "Stop placing" : "Place on the field";
        dom.placeCellModeBtn.classList.toggle("active", value);
    }

    dom.canvas?.classList.toggle("cell-create-mode-active", value);
}

export async function spawnDraftCell(x, y) {
    if (!state.cellDraft) return;
    await spawnCell(x, y, state.cellDraft);
}

export async function ensureCreateCellPreviewReady() {
    if (!state.cellDraft) {
        await initCreatePanel();
    }

    requestAnimationFrame(() => drawCreateCellPreview());
}

function applyGenomeInputRanges() {
    for (const field of createCellFields) {
        applyGenomeRange(field);
    }
}

function applyGenomeRange(field) {
    const range = state.config?.initialGenome?.[field.key];

    if (!range) {
        console.warn(`Missing genome range from backend: ${field.key}`);
        return;
    }

    field.range.min = String(range.min);
    field.range.max = String(range.max);
    field.range.step = String(range.step);

    field.input.min = String(range.min);
    field.input.max = String(range.max);
    field.input.step = String(range.step);
}

function clampGenomeValue(key, value) {
    const range = state.config?.initialGenome?.[key];

    if (!range) {
        return value;
    }

    return Math.max(Number(range.min), Math.min(Number(range.max), Number(value)));
}

function applyMotionInputRanges() {
    for (const { configKey, range, input } of createMotionFields) {
        const control = state.config?.[configKey];
        if (!control) {
            console.warn(`Missing range from backend: ${configKey}`);
            continue;
        }

        applyRange(range, control);
        applyRange(input, control);
    }
}

function applyRange(element, control) {
    if (!element) return;

    element.min = String(control.min);
    element.max = String(control.max);
    element.step = String(control.step);
}

function clampMotionValue(key, value) {
    if (!Number.isFinite(value)) {
        throw new Error(`Invalid value for ${key}`);
    }

    if (key === "initialSpeed") {
        const control = state.config.initialCellSpeed;
        return Math.max(control.min, Math.min(control.max, value));
    }

    return value;
}

function wrapAngle(value) {
    if (!Number.isFinite(value)) {
        throw new Error("Invalid value for initialDirection");
    }

    return ((value % 360.0) + 360.0) % 360.0;
}