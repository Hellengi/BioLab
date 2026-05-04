/**
 * CreationPanel.js — панель создания новой клетки.
 */

import { state, loadSimulationConfig } from "../../store/SimulationStore.js";
import { dom } from "../dom.js";
import { spawnCell } from "../../transport/api/cells.js";
import { drawCreateCellPreview } from "../../render/preview.js";
import { showSidePanel, SidePanel } from "../ui.js";

// ---------------------------------------------------------------------------
// Описание полей формы (slider ↔ number input)
// ---------------------------------------------------------------------------

export const createCellFields = [
    { key: "divisionThreshold", range: dom.createDivisionThresholdSlider, input: dom.createDivisionThresholdInput },
    { key: "divisionImpulseStrength", range: dom.createDivisionImpulseSlider, input: dom.createDivisionImpulseInput },
    { key: "colorHue", range: dom.createColorHueSlider, input: dom.createColorHueInput },
    { key: "saturation", range: dom.createSaturationSlider, input: dom.createSaturationInput },
    { key: "lightness", range: dom.createLightnessSlider, input: dom.createLightnessInput },
    { key: "maxEnergy", range: dom.createMaxEnergySlider, input: dom.createMaxEnergyInput },
];

// ---------------------------------------------------------------------------
// Lifecycle handlers (вызываются из events.js)
// ---------------------------------------------------------------------------

/** Обработчик кнопки "Create cell" */
export async function onStartCreateCell() {
    if (!state.config) {
        await loadSimulationConfig();
    }
    state.cellDraft = createDraft();
    if (dom.createCellTemplateNameInput) dom.createCellTemplateNameInput.value = "";
    syncDraftForm();
    setPlaceMode(false);
    showSidePanel(SidePanel.CREATE);
}

/** Обработчик кнопки "Cancel" в панели создания */
export function onCancelCreateCell() {
    state.cellDraft = null;
    setPlaceMode(false);
    drawCreateCellPreview();
    showSidePanel(state.selectedCellId ? SidePanel.SELECTED : SidePanel.EMPTY);
}

/** Обработчик кнопки "Place on the field" — включает режим размещения */
export function enableCellPlacement() {
    state.cellDraft = readDraftForm(); // бросает, если форма невалидна
    drawCreateCellPreview();
    setPlaceMode(true);
}

/** Обработчик изменения любого поля формы */
export function onCreateFormChange() {
    updateDraft();
}

// ---------------------------------------------------------------------------
// Draft helpers
// ---------------------------------------------------------------------------

/** Создаёт черновик с дефолтными значениями из конфига симуляции */
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

/** Синхронизирует поля формы из state.cellDraft */
export function syncDraftForm() {
    if (!state.cellDraft?.genome) return;

    for (const { key, range, input } of createCellFields) {
        const value = String(state.cellDraft.genome[key]);
        if (range) range.value = value;
        if (input) input.value = value;
    }

    drawCreateCellPreview();
}

/** Читает значения из формы в объект draft (бросает на невалидных данных) */
export function readDraftForm() {
    const draft = {
        id: null,
        name: null,
        genome: {}
    };

    for (const { key, input } of createCellFields) {
        const value = Number(input?.value);
        if (!Number.isFinite(value)) {
            throw new Error(`Invalid value for ${key}`);
        }

        draft.genome[key] = value;
    }

    return draft;
}

/** Читает форму и обновляет state.cellDraft + перерисовывает превью */
export function updateDraft() {
    state.cellDraft = readDraftForm();
    drawCreateCellPreview();
}

// ---------------------------------------------------------------------------
// Place mode
// ---------------------------------------------------------------------------

/** Включает/выключает режим размещения клетки */
export function setPlaceMode(value) {
    state.placeMode = value;

    if (dom.createCellModeHint) {
        dom.createCellModeHint.textContent = value
            ? "Placement mode is ON — click on the field"
            : "Placement mode is off";
    }

    dom.canvas?.classList.toggle("cell-create-mode-active", value);
}

/** Размещает черновик клетки на указанных координатах */
export async function spawnDraftCell(x, y) {
    if (!state.cellDraft) return;
    await spawnCell(x, y, state.cellDraft);
}