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
import { setTooltipPair } from "../cell-info.js";
import { initOrganellePanels, chloroplastEnabled as _getChloroplastEnabled } from "./creation-organelle.js";

// ─── Поля генома ──────────────────────────────────────────────────────────────

/*
 * Формируем список полей только после bindDom().
 * При создании массива на уровне модуля dom.* ещё не заполнен,
 * и в массивах навсегда оставались undefined.
 */
export function getCreateCellFields() {
    return [
        { key: "divisionThreshold", range: dom.createDivisionThresholdSlider, input: dom.createDivisionThresholdInput },
        { key: "divisionImpulse",   range: dom.createDivisionImpulseSlider,   input: dom.createDivisionImpulseInput },
        { key: "divisionAngle",     range: dom.createDivisionAngleSlider,     input: dom.createDivisionAngleInput },
        { key: "colorHue",          range: dom.createColorHueSlider,          input: dom.createColorHueInput },
        { key: "saturation",        range: dom.createSaturationSlider,        input: dom.createSaturationInput },
        { key: "lightness",         range: dom.createLightnessSlider,         input: dom.createLightnessInput },
        { key: "maxEnergy",         range: dom.createMaxEnergySlider,         input: dom.createMaxEnergyInput },
        { key: "dryMass",           range: dom.createDryMassSlider,           input: dom.createDryMassInput },
        { key: "elasticity",        range: dom.createElasticitySlider,        input: dom.createElasticityInput },
    ];
}

export function getCreateChloroplastFields() {
    return [
        { key: "chloroplastAmount", range: dom.createChloroplastAmountSlider, input: dom.createChloroplastAmountInput },
        { key: "chlorophyll",       range: dom.createChlorophyllSlider,       input: dom.createChlorophyllInput },
        { key: "carotenoids",       range: dom.createCarotenoidsSlider,       input: dom.createCarotenoidsInput },
    ];
}

const CHLOROPLAST_DEFAULTS = {
    chloroplastAmount: { min: 0, max: 100, value: 50, step: 1 },
    chlorophyll:       { min: 0, max: 100, value: 50, step: 1 },
    carotenoids:       { min: 0, max: 100, value: 20, step: 1 },
};

// ─── Инициализация ────────────────────────────────────────────────────────────

export async function initCreatePanel() {
    if (!state.config) {
        await loadSimulationConfig();
    }
    resetCreatePanelFromConfig();
    // Передаём колбэк: при переключении хлоропласта вызываем onCreateFormChange
    initOrganellePanels(onCreateFormChange);
    _initModeSwitcher();
}

export function resetCreatePanelFromConfig() {
    _applyGenomeInputRanges();
    _applyChloroplastInputRanges();
    state.cellDraft = createDraft();
    syncDraftToForm();
    setPlaceMode(false);
}

// ─── Черновик ─────────────────────────────────────────────────────────────────

function createDraft() {
    if (!state.config?.initialGenome) throw new Error("Config not loaded");

    const genome = Object.fromEntries(
        getCreateCellFields().map(({ key }) => [key, state.config.initialGenome[key].value])
    );
    genome.code = state.config.initialGenome.code;

    genome.chloroplastAmount  = CHLOROPLAST_DEFAULTS.chloroplastAmount.value;
    genome.chlorophyll        = CHLOROPLAST_DEFAULTS.chlorophyll.value;
    genome.carotenoids        = CHLOROPLAST_DEFAULTS.carotenoids.value;
    // Читаем актуальное значение из модуля organelle
    genome.chloroplastEnabled = _getChloroplastEnabled;

    return { id: null, name: null, genome };
}

export function syncDraftToForm() {
    if (!state.cellDraft?.genome) return;

    for (const { key, range, input } of getCreateCellFields()) {
        const v = String(state.cellDraft.genome[key]);
        if (range) range.value = v;
        if (input) input.value = v;
    }
    for (const { key, range, input } of getCreateChloroplastFields()) {
        const v = String(state.cellDraft.genome[key] ?? 0);
        if (range) range.value = v;
        if (input) input.value = v;
    }

    _syncInfoPane();
    drawCreateCellPreview();
}

export function readDraftFromForm() {
    if (!state.cellDraft?.genome) throw new Error("Draft not initialised");

    const draft = { id: null, name: null, genome: {} };

    for (const { key, input } of getCreateCellFields()) {
        const raw = input ? Number(input.value) : NaN;
        draft.genome[key] = _clampGenomeValue(
            key,
            Number.isFinite(raw) ? raw : state.cellDraft.genome[key]
        );
    }
    for (const { key, input } of getCreateChloroplastFields()) {
        const raw = input ? Number(input.value) : NaN;
        draft.genome[key] = Number.isFinite(raw) ? raw : (state.cellDraft.genome[key] ?? 0);
    }

    draft.genome.chloroplastEnabled = _getChloroplastEnabled;
    return draft;
}

// ─── Обработчики ──────────────────────────────────────────────────────────────

export function onCreateFormChange() {
    if (!state.cellDraft) return;
    state.cellDraft = readDraftFromForm();
    _syncInfoPane();
    drawCreateCellPreview();
}

// ─── Режим размещения ─────────────────────────────────────────────────────────

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
        // Переключаем классы нового индикатора
        hint.classList.remove("preview-mode-badge--create-on", "preview-mode-badge--create-off");
        hint.classList.add(active ? "preview-mode-badge--create-on" : "preview-mode-badge--create-off");

        // Обновляем текст
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

// ─── Спавн ────────────────────────────────────────────────────────────────────

export async function spawnDraftCell(x, y) {
    if (!state.cellDraft) return;
    await spawnCell(x, y, state.cellDraft);
}

export async function ensureCreateCellPreviewReady() {
    if (!state.cellDraft) await initCreatePanel();
    requestAnimationFrame(() => drawCreateCellPreview());
}

// ─── Переключатель режимов ────────────────────────────────────────────────────

function _initModeSwitcher() {
    const switcher = document.getElementById("createModeSwitcher");
    const track    = document.getElementById("createContentTrack");
    if (!switcher || !track) return;

    track.dataset.active = switcher.dataset.active || "organelles";

    switcher.addEventListener("click", e => {
        const rect = switcher.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const mode = relX < rect.width / 2 ? "organelles" : "info";

        if (switcher.dataset.active === mode) return;

        switcher.dataset.active = mode;
        track.dataset.active = mode;
    });
}

// ─── Info-панель ──────────────────────────────────────────────────────────────

function _syncInfoPane() {
    if (!state.cellDraft?.genome) return;
    const g = state.cellDraft.genome;

    setTooltipPair(
        document.getElementById("createInfoMass"),
        formatTwoDecimals(g.dryMass), "mass = dryMass + energy × factor",
        formatTwoDecimals(g.dryMass), "dry mass"
    );
    setTooltipPair(
        document.getElementById("createInfoEnergy"),
        formatTwoDecimals(g.maxEnergy), "initial energy",
        formatTwoDecimals(g.maxEnergy), "maximum energy"
    );

    _setPlainText("createInfoElasticity",        formatTwoDecimals(g.elasticity));
    _setPlainText("createInfoDivisionThreshold", formatTwoDecimals(g.divisionThreshold));
    _setPlainText("createInfoDivisionImpulse",   formatTwoDecimals(g.divisionImpulse));
    _setPlainText("createInfoDivisionAngle",     formatTwoDecimals(g.divisionAngle ?? 0) + "°");
    _setPlainText("createInfoRgb",
        `hsl(${Math.round(g.colorHue)}, ${Math.round(g.saturation)}%, ${Math.round(g.lightness)}%)`);
}

function _setPlainText(id, value) {
    const el = document.getElementById(id);
    if (el) setText(el, value ?? "—");
}

// ─── Приватные хелперы ────────────────────────────────────────────────────────

function _applyGenomeInputRanges() {
    for (const { key, range, input } of getCreateCellFields()) {
        const b = state.config?.initialGenome?.[key];
        if (!b) { console.warn("Missing genome range:", key); continue; }
        applyInputBounds(range, b);
        applyInputBounds(input, b);
    }
}

function _applyChloroplastInputRanges() {
    for (const { key, range, input } of getCreateChloroplastFields()) {
        const b = CHLOROPLAST_DEFAULTS[key];
        if (!b) continue;
        applyInputBounds(range, b);
        applyInputBounds(input, b);
    }
}

function _clampGenomeValue(key, value) {
    const b = state.config?.initialGenome?.[key];
    if (!b) return value;
    return Math.max(Number(b.min), Math.min(Number(b.max), value));
}
