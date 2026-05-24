/**
 * ui/events.js
 * Точка привязки всех событий UI.
 * Каждая группа обработчиков делегируется соответствующему модулю.
 */

import { dom } from "./dom.js";
import { bindSettingsForm, resetSettings } from "./tabs/settings.js";
import {
    openSaveWorldModal,
    openLoadWorldModal,
    confirmSaveWorld,
    confirmLoadWorld,
    deleteSelectedWorld,
} from "./panels/snapshot.js";
import {
    confirmSaveSelectedCell,
    confirmSaveDraftCell,
    openLoadCellModal,
    confirmLoadCell,
    deleteSelectedTemplate,
} from "./panels/templates.js";
import {
    toggleCellPlacement,
    onCreateFormChange,
    getCreateCellFields,
    getCreateChloroplastFields,
    setPlaceMode,
} from "./tabs/creation.js";
import { onCanvasClick }                from "./panels/canvas.js";
import { bindCanvasMouseEvents }        from "./panels/cursor.js";
import { bindInputs, closeModal, bindAsyncClick } from "./panels/_panels.js";
import { initTabs }                     from "./tabs/_tabs.js";
import { drawSelectedCellPreview, setForceViewEnabled } from "../render/preview.js";
import { handleSimulationReset, togglePause } from "../store/actions.js";
import { state } from "../store/state.js";
import {
    endSliderDrag,
    resetTimeToNormal,
    startSliderDrag,
    updateTimeLocal,
} from "../store/slider.js";

// ── Точка входа ───────────────────────────────────────────────────────────────

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

// ── Тулбар ────────────────────────────────────────────────────────────────────

function bindToolbarEvents() {
    dom.timeSlider.addEventListener("pointerdown", () => startSliderDrag());
    dom.timeSlider.addEventListener("input",       () => updateTimeLocal(dom.timeSlider.value));
    dom.timeSlider.addEventListener("pointerup",   () => endSliderDrag());
    dom.timeSlider.addEventListener("touchend",    () => endSliderDrag(), { passive: true });
    dom.tempDisplay.addEventListener("click",      () => resetTimeToNormal());

    dom.pauseBtn.addEventListener("click", () => togglePause());

    bindAsyncClick(dom.resetBtn, handleSimulationReset,
        "Reset simulation error", "Failed to reset simulation");
}

// ── Панель настроек ───────────────────────────────────────────────────────────

function bindSettingsTabEvents() {
    bindAsyncClick(dom.resetSettingsBtn, resetSettings,
        "Reset settings error", "Failed to reset settings");

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

    bindAsyncClick(dom.saveWorldConfirmBtn, confirmSaveWorld,  "Save world error",   "Failed to save world");
    bindAsyncClick(dom.loadWorldConfirmBtn, confirmLoadWorld,  "Load world error",   "Failed to load world");
    bindAsyncClick(dom.loadWorldDeleteBtn,  deleteSelectedWorld, "Delete world error", "Failed to delete world");
}

// ── Панель выбранной клетки ───────────────────────────────────────────────────

function syncForceViewUi(active) {
    dom.forceViewToggleBtn?.classList.toggle("active", active);

    const badge = dom.forceViewIndicator;
    if (!badge) return;

    badge.classList.toggle("preview-mode-badge--forces", active);
    badge.classList.toggle("preview-mode-badge--normal", !active);

    const text = badge.querySelector(".preview-mode-badge-text");
    if (text) {
        text.textContent = active ? "Forces" : "Normal";
    }
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

    const forceBtn = dom.forceViewToggleBtn;
    if (forceBtn) {
        forceBtn.addEventListener("click", () => {
            const isActive = !forceBtn.classList.contains("active");

            setForceViewEnabled(isActive);
            syncForceViewUi(isActive);

            const selectedCell = state.cellById?.get(state.selectedCellId);
            if (selectedCell && state.selectedCellTemplate) {
                drawSelectedCellPreview(selectedCell, state.selectedCellTemplate);
            }
        });
    }
}

// ── Панель создания клетки ────────────────────────────────────────────────────

function bindCreatePanelEvents() {
    dom.placeCellModeBtn?.addEventListener("click", () => {
        void toggleCellPlacement().catch(err => {
            console.error("Failed to toggle cell placement mode", err);
            alert("Failed to toggle placement mode");
        });
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

    bindAsyncClick(dom.saveCellConfirmBtn, confirmSaveDraftCell,    "Save draft cell error",  "Failed to save template");
    bindAsyncClick(dom.loadCellConfirmBtn, confirmLoadCell,          "Load cell error",        "Failed to load template");
    bindAsyncClick(dom.loadCellDeleteBtn,  deleteSelectedTemplate,   "Delete template error",  "Failed to delete template");
}

function bindCreateFormEvents() {
    for (const { range, input } of getCreateCellFields()) {
        bindInputs(range, input, onCreateFormChange);
    }
    for (const { range, input } of getCreateChloroplastFields()) {
        bindInputs(range, input, onCreateFormChange);
    }
}

// ── Canvas-события ────────────────────────────────────────────────────────────

function bindCanvasEvents() {
    dom.canvas.addEventListener("click", onCanvasClick);
    bindCanvasMouseEvents(dom.canvas);
}

// ── Клавиатура ────────────────────────────────────────────────────────────────

function bindKeyboardEvents() {
    document.addEventListener("keydown", event => {
        if (event.repeat || _isTypingTarget(event.target)) return;

        if (event.key === "Escape") {
            if (state.placeMode) setPlaceMode(false);
            return;
        }

        if (event.code === "Space") {
            event.preventDefault();
            void togglePause();
        }
    });
}

function _isTypingTarget(target) {
    if (!(target instanceof HTMLElement)) return false;
    return target.matches("input, textarea, select") || target.isContentEditable;
}

// ── Боковая панель (мобильный режим) ─────────────────────────────────────────

function bindSidebarToggle() {
    const wrapper = document.querySelector(".sidebar-wrapper");
    if (!wrapper || !dom.sidebarToggleBtn) return;

    const mobileSidebarQuery = window.matchMedia("(max-width: 900px)");

    function syncSidebarState() {
        if (!mobileSidebarQuery.matches) {
            wrapper.classList.remove("sidebar-open");
            document.body.classList.remove("sidebar-hidden");
            return;
        }

        document.body.classList.toggle(
            "sidebar-hidden",
            !wrapper.classList.contains("sidebar-open")
        );
    }

    syncSidebarState();

    mobileSidebarQuery.addEventListener("change", syncSidebarState);

    dom.sidebarToggleBtn.addEventListener("click", () => {
        if (!mobileSidebarQuery.matches) return;

        wrapper.classList.toggle("sidebar-open");
        syncSidebarState();
    });

    document.addEventListener("click", event => {
        if (!mobileSidebarQuery.matches) return;

        const clickedToggle = dom.sidebarToggleBtn.contains(event.target);
        const clickedInsideSidebar = wrapper.contains(event.target);

        if (
            wrapper.classList.contains("sidebar-open") &&
            !clickedInsideSidebar &&
            !clickedToggle
        ) {
            wrapper.classList.remove("sidebar-open");
            syncSidebarState();
        }
    });
}
