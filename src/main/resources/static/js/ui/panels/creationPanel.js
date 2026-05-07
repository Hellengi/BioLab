import { state, loadSimulationConfig } from "../../store/store.js";
import { dom } from "../dom.js";
import { spawnCell } from "../../transport/api/cellsApi.js";
import { drawCreateCellPreview } from "../../render/preview.js";

export const createCellFields = [
    { key: "divisionThreshold", range: dom.createDivisionThresholdSlider, input: dom.createDivisionThresholdInput },
    { key: "divisionImpulseStrength", range: dom.createDivisionImpulseSlider, input: dom.createDivisionImpulseInput },
    { key: "colorHue", range: dom.createColorHueSlider, input: dom.createColorHueInput },
    { key: "saturation", range: dom.createSaturationSlider, input: dom.createSaturationInput },
    { key: "lightness", range: dom.createLightnessSlider, input: dom.createLightnessInput },
    { key: "maxEnergy", range: dom.createMaxEnergySlider, input: dom.createMaxEnergyInput },
];

export async function initCreatePanel() {
    if (!state.config) {
        await loadSimulationConfig();
    }
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
            divisionThreshold: state.config.initialGenome.divisionThreshold,
            divisionImpulseStrength: state.config.initialGenome.divisionImpulseStrength,
            colorHue: state.config.initialGenome.colorHue,
            saturation: state.config.initialGenome.saturation,
            lightness: state.config.initialGenome.lightness,
            maxEnergy: state.config.initialGenome.maxEnergy,
            code: state.config.initialGenome.code,
        }
    };
}

export function syncDraftForm() {
    if (!state.cellDraft?.genome) return;

    for (const { key, range, input } of createCellFields) {
        const value = String(state.cellDraft.genome[key]);
        if (range) range.value = value;
        if (input) input.value = value;
    }

    drawCreateCellPreview();
}

export function readDraftForm() {
    const draft = { id: null, name: null, genome: {} };

    for (const { key, input } of createCellFields) {
        const value = Number(input?.value);
        if (!Number.isFinite(value)) {
            throw new Error(`Invalid value for ${key}`);
        }
        draft.genome[key] = value;
    }

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