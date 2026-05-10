import { dom } from "./dom.js";
import {
    handleSimulationReset,
    togglePause,
    startSliderDrag,
    endSliderDrag,
    updateTimeLocal,
    resetTimeToNormal,
    setCursorLight,
    state,
} from "../store/store.js";
import { bindSettingsForm, resetSettings } from "./panels/settingsPanel.js";
import { openSaveWorldModal, openLoadWorldModal, confirmSaveWorld, confirmLoadWorld, deleteSelectedWorld } from "./panels/snapshotPanel.js";
import {
    confirmSaveSelectedCell,
    confirmSaveDraftCell,
    openLoadCellModal,
    confirmLoadCell,
    deleteSelectedTemplate,
} from "./panels/templatesPanel.js";
import { toggleCellPlacement, onCreateFormChange, createCellFields, createMotionFields, setPlaceMode } from "./panels/creationPanel.js";
import { onCanvasClick } from "./panels/canvasController.js";
import { bindInputs, closeModal } from "./panels.js";
import { initTabs } from "./panels/tabsPanel.js";
import { updateCursorReadout } from "./panels/cursorReadoutPanel.js";
import { drawSelectedCellPreview, setForceViewEnabled } from "../render/preview.js";

export function bindEvents() {
    initTabs();
    bindToolbarEvents();
    bindSettingsTabEvents();
    bindSelectedCellEvents();
    bindCreatePanelEvents();
    bindCreateFormEvents();
    bindCanvasEvents();
    bindKeyboardEvents();
    bindSidebarToggle();
    bindSettingsForm();
}

function bindToolbarEvents() {
    dom.timeSlider.addEventListener("pointerdown", () => startSliderDrag());
    dom.tempDisplay.addEventListener("click", () => resetTimeToNormal());
    dom.timeSlider.addEventListener("input", () => updateTimeLocal(dom.timeSlider.value));
    dom.timeSlider.addEventListener("pointerup", () => endSliderDrag(dom.timeSlider.value));
    dom.timeSlider.addEventListener("touchend", () => endSliderDrag(dom.timeSlider.value), { passive: true });

    dom.pauseBtn.addEventListener("click", () => togglePause());

    bindAsyncClick(dom.resetBtn, handleSimulationReset,
        "Reset simulation error", "Failed to reset simulation");
}

function bindSettingsTabEvents() {
    bindAsyncClick(dom.resetSettingsBtn, resetSettings, "Reset settings error", "Failed to reset settings");

    dom.exportWorldBtn?.addEventListener("click", openSaveWorldModal);
    dom.importWorldBtn?.addEventListener("click", () =>
        openLoadWorldModal().catch(err => {
            console.error("Open load world modal error", err);
            alert("Failed to load worlds list");
        })
    );

    dom.saveWorldCancelBtn?.addEventListener("click", () => closeModal(dom.saveWorldModal));
    dom.loadWorldCancelBtn?.addEventListener("click", () => closeModal(dom.loadWorldModal));

    dom.saveWorldModal?.addEventListener("click", e => {
        if (e.target === dom.saveWorldModal) closeModal(dom.saveWorldModal);
    });
    dom.loadWorldModal?.addEventListener("click", e => {
        if (e.target === dom.loadWorldModal) closeModal(dom.loadWorldModal);
    });

    bindAsyncClick(dom.saveWorldConfirmBtn, confirmSaveWorld, "Save world error", "Failed to save world");
    bindAsyncClick(dom.loadWorldConfirmBtn, confirmLoadWorld, "Load world error", "Failed to load world");
    bindAsyncClick(dom.loadWorldDeleteBtn, deleteSelectedWorld, "Delete world error", "Failed to delete world");
}

function bindSelectedCellEvents() {
    dom.saveSelectedCellBtn?.addEventListener("click", () => {
        if (dom.saveSelectedCellNameInput) dom.saveSelectedCellNameInput.value = "";
        dom.saveSelectedCellModal?.classList.remove("hidden");
    });

    dom.saveSelectedCellCancelBtn?.addEventListener("click", () => closeModal(dom.saveSelectedCellModal));
    dom.saveSelectedCellModal?.addEventListener("click", e => {
        if (e.target === dom.saveSelectedCellModal) closeModal(dom.saveSelectedCellModal);
    });

    bindAsyncClick(dom.saveSelectedCellConfirmBtn, confirmSaveSelectedCell,
        "Save selected cell error", "Failed to save cell template");

    dom.forceViewToggle?.addEventListener("change", () => {
        setForceViewEnabled(dom.forceViewToggle.checked);

        const selectedCell = state.cellById?.get(state.selectedCellId);
        if (selectedCell && state.selectedCellTemplate) {
            drawSelectedCellPreview(selectedCell, state.selectedCellTemplate);
        }
    });
}

function bindCreatePanelEvents() {
    dom.placeCellModeBtn?.addEventListener("click", () => {
        try {
            toggleCellPlacement();
        } catch (err) {
            console.error("Failed to toggle cell placement mode", err);
            alert("Failed to toggle placement mode");
        }
    });

    dom.exportCellBtn?.addEventListener("click", () => {
        if (dom.saveCellNameInput) dom.saveCellNameInput.value = "";
        dom.saveCellModal?.classList.remove("hidden");
    });

    dom.importCellBtn?.addEventListener("click", () =>
        openLoadCellModal().catch(err => {
            console.error("Open load cell modal error", err);
            alert("Failed to load templates list");
        })
    );

    dom.saveCellCancelBtn?.addEventListener("click", () => closeModal(dom.saveCellModal));
    dom.loadCellCancelBtn?.addEventListener("click", () => closeModal(dom.loadCellModal));

    dom.saveCellModal?.addEventListener("click", e => {
        if (e.target === dom.saveCellModal) closeModal(dom.saveCellModal);
    });
    dom.loadCellModal?.addEventListener("click", e => {
        if (e.target === dom.loadCellModal) closeModal(dom.loadCellModal);
    });

    bindAsyncClick(dom.saveCellConfirmBtn, confirmSaveDraftCell, "Save draft cell error", "Failed to save template");
    bindAsyncClick(dom.loadCellConfirmBtn, confirmLoadCell, "Load cell error", "Failed to load template");
    bindAsyncClick(dom.loadCellDeleteBtn, deleteSelectedTemplate, "Delete template error", "Failed to delete template");
}

function bindCreateFormEvents() {
    for (const { range, input } of createCellFields) {
        bindInputs(range, input, onCreateFormChange);
    }

    for (const { range, input } of createMotionFields) {
        bindInputs(range, input, onCreateFormChange);
    }
}

function bindCanvasEvents() {
    dom.canvas.addEventListener("click", onCanvasClick);
    dom.canvas.addEventListener("mousemove", onCanvasMouseMove);
    dom.canvas.addEventListener("mouseleave", onCanvasMouseLeave);
}

function onCanvasMouseMove(event) {
    const lighting = state.world?.lighting;
    if (!lighting) return;

    const rect = dom.canvas.getBoundingClientRect();
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;

    const light = sampleLightAt(cx, cy, lighting);
    setCursorLight(light);
    updateCursorReadout();
}

function onCanvasMouseLeave() {
    setCursorLight(null);
    updateCursorReadout();
}

function sampleLightAt(cx, cy, lighting) {
    const { lightMap, gridStep, gridWidth, gridHeight, globalLight } = lighting;

    if (!lightMap?.length || gridStep <= 0 || gridWidth <= 0 || gridHeight <= 0) {
        return globalLight ?? null;
    }

    const col = Math.floor(cx / gridStep);
    const row = Math.floor(cy / gridStep);
    const clampedCol = Math.max(0, Math.min(gridWidth - 1, col));
    const clampedRow = Math.max(0, Math.min(gridHeight - 1, row));

    return lightMap[clampedRow * gridWidth + clampedCol] ?? globalLight;
}

function bindKeyboardEvents() {
    document.addEventListener("keydown", event => {
        if (event.repeat || isTypingTarget(event.target)) {
            return;
        }

        if (event.key === "Escape") {
            if (state.placeMode) {
                setPlaceMode(false);
            }
            return;
        }

        if (event.code === "Space") {
            event.preventDefault();
            void togglePause();
        }
    });
}

function isTypingTarget(target) {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return target.matches("input, textarea, select") || target.isContentEditable;
}

function bindSidebarToggle() {
    const wrapper = document.querySelector(".sidebar-wrapper");
    if (!dom.sidebarToggleBtn || !wrapper) return;

    dom.sidebarToggleBtn.addEventListener("click", () => {
        wrapper.classList.toggle("sidebar-open");
    });

    document.addEventListener("click", (event) => {
        if (
            wrapper.classList.contains("sidebar-open") &&
            !wrapper.contains(event.target) &&
            event.target !== dom.sidebarToggleBtn
        ) {
            wrapper.classList.remove("sidebar-open");
        }
    });
}

function bindAsyncClick(element, handler, logMessage, alertMessage) {
    if (!element) return;
    element.addEventListener("click", () => {
        handler().catch(err => {
            console.error(logMessage, err);
            alert(alertMessage);
        });
    });
}