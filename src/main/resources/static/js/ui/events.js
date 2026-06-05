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
    syncCreateInfoPanel,
    getCreateCellFields,
    getCreateDebugFields,
    getCreateChloroplastFields,
    setPlaceMode,
} from "./tabs/creation.js";
import { onCanvasClick }                from "./panels/canvas.js";
import { bindCanvasMouseEvents }        from "./panels/cursor.js";
import { bindCanvasCameraEvents }       from "./panels/canvas-camera.js";
import { bindInputs, closeModal, bindAsyncClick } from "./panels/_panels.js";
import { initTabs }                     from "./tabs/_tabs.js";
import {
    drawCreateCellPreview,
    drawSelectedCellPreview,
    handleCreatePreviewClick,
    handleCreatePreviewPointerLeave,
    handleCreatePreviewPointerMove,
    handleSelectedPreviewClick,
    handleSelectedPreviewPointerLeave,
    handleSelectedPreviewPointerMove,
    markSelectedPreviewScopeSelected,
    markCreatePreviewScopeSelected,
    syncCreatePreviewScopeSelectionWithoutFade,
    setPreviewLayerCount,
    setSelectedPreviewMode,
} from "../render/preview.js";
import { handleSimulationReset, togglePause } from "../store/actions.js";
import { setCreateInfoScope, setDisplayLayer, setSelectedInfoScope, state } from "../store/state.js";
import { sendDisplayLayers } from "../transport/ws/socket.js";
import { bindToolbarTooltips } from "./toolbar.js";
import { t } from "../localization/localization.js";
import {
    closeActiveOrganellePanel,
    hasActiveOrganellePanel,
    openOrganellePanel,
} from "./tabs/creation-organelle.js";
import { refreshSelection } from "./tabs/selection.js";
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
    bindDisplayLayerEvents();
    bindSelectedCellEvents();
    bindPreviewLayerEvents();
    bindPreviewLightEvents();
    bindCreatePanelEvents();
    bindCreateFormEvents();
    bindCanvasEvents();
    bindPreviewScopeEvents();
    bindKeyboardEvents();
    bindSidebarToggle();
    bindSettingsForm();
}

// ── Тулбар ────────────────────────────────────────────────────────────────────

function bindToolbarEvents() {
    bindToolbarTooltips();

    dom.timeSlider.addEventListener("pointerdown", () => startSliderDrag());
    dom.timeSlider.addEventListener("input",       () => updateTimeLocal(dom.timeSlider.value));
    dom.timeSlider.addEventListener("pointerup",   () => endSliderDrag());
    dom.timeSlider.addEventListener("touchend",    () => endSliderDrag(), { passive: true });
    dom.timeDisplay?.addEventListener("click",      () => resetTimeToNormal());

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
            alert(t("Failed to load worlds list"));
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


// ── Слои отображения ─────────────────────────────────────────────────────────

function bindDisplayLayerEvents() {
    const buttons = [
        dom.opacityLayerToggle,
        dom.lightDirectionLayerToggle,
        dom.quadtreeLayerToggle,
        dom.cellDirectionsLayerToggle,
    ].filter(Boolean);

    for (const button of buttons) {
        const layer = button.dataset.layer;
        syncDisplayLayerButton(button, Boolean(state.displayLayers[layer]));

        button.addEventListener("click", () => {
            const enabled = !button.classList.contains("active");
            setDisplayLayer(layer, enabled);
            syncDisplayLayerButton(button, enabled);
            sendDisplayLayers();
        });
    }
}

function syncDisplayLayerButton(button, enabled) {
    button.classList.toggle("active", enabled);
    button.setAttribute("aria-pressed", String(enabled));
}


function bindPreviewLayerEvents() {
    const buttons = dom.previewLayerButtons ?? [];
    if (buttons.length === 0) return;

    const sync = () => {
        const count = state.previewLayerCount ?? 3;
        for (const button of buttons) {
            const level = Number(button.dataset.previewLayerCount ?? 0);
            button.classList.toggle("active", level <= count);
            button.setAttribute("aria-pressed", String(level <= count));
        }
    };

    sync();
    for (const button of buttons) {
        button.addEventListener("click", () => {
            const selectedLayerButton = Boolean(button.closest("#previewLayerControls"));
            if (selectedLayerButton && state.selectedPreviewMode !== "general") return;
            const count = Number(button.dataset.previewLayerCount ?? 3);
            setPreviewLayerCount(count);
            sync();
            if (selectedLayerButton) {
                const selectedCell = state.cellById?.get(state.selectedCellId);
                if (selectedCell && state.selectedStrain) drawSelectedCellPreview(selectedCell, state.selectedStrain);
            } else {
                drawCreateCellPreview();
            }
        });
    }
}

function bindPreviewLightEvents() {
    dom.selectedCellPreviewCanvas?.addEventListener("pointermove", handleSelectedPreviewPointerMove);
    dom.selectedCellPreviewCanvas?.addEventListener("pointerleave", handleSelectedPreviewPointerLeave);
    dom.selectedCellPreviewCanvas?.addEventListener("click", handleSelectedPreviewClick);

    dom.createCellPreviewCanvas?.addEventListener("pointermove", handleCreatePreviewPointerMove);
    dom.createCellPreviewCanvas?.addEventListener("pointerleave", handleCreatePreviewPointerLeave);
    dom.createCellPreviewCanvas?.addEventListener("click", handleCreatePreviewClick);
}

// ── Панель выбранной клетки ───────────────────────────────────────────────────

function syncSelectedModeUi(mode) {
    setSelectedPreviewMode(mode);
    refreshSelection(true);
    sendDisplayLayers();
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

    for (const button of dom.selectedPreviewModeButtons ?? []) {
        button.addEventListener("click", () => syncSelectedModeUi(button.dataset.previewMode ?? "general"));
    }

    dom.selectedInfoScopeControls?.addEventListener("click", event => {
        const button = event.target.closest("[data-info-scope]");
        if (!button || button.disabled) return;
        const scope = button.dataset.infoScope ?? "general";
        if ((state.selectedPreviewMode ?? "general") === "forces" && scope !== "general") return;
        setSelectedInfoScope(scope);
        markSelectedPreviewScopeSelected(scope);
        refreshSelection(true);
    });
}

// ── Панель создания клетки ────────────────────────────────────────────────────

function bindCreatePanelEvents() {
    dom.placeCellModeBtn?.addEventListener("click", () => {
        void toggleCellPlacement().catch(err => {
            console.error("Failed to toggle cell placement mode", err);
            alert(t("Failed to toggle placement mode"));
        });
    });

    dom.exportCellBtn?.addEventListener("click", () => {
        if (dom.saveCellNameInput) dom.saveCellNameInput.value = "";
        dom.saveCellModal?.classList.remove("hidden");
    });

    dom.importCellBtn?.addEventListener("click", () =>
        openLoadCellModal().catch(err => {
            console.error("Open load cell modal error", err);
            alert(t("Failed to load templates list"));
        })
    );

    dom.createInfoScopeControls?.addEventListener("click", event => {
        const button = event.target.closest("[data-create-info-scope]");
        if (!button) return;
        const scope = button.dataset.createInfoScope ?? "general";
        setCreateInfoScope(scope);
        window.dispatchEvent(new CustomEvent("biolab:create-info-scope-change", {
            detail: {scope, source: "button", fadeHighlight: true}
        }));
    });

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
    for (const { range, input } of [...getCreateCellFields(), ...getCreateDebugFields()]) {
        bindInputs(range, input, onCreateFormChange);
    }
    for (const { range, input } of getCreateChloroplastFields()) {
        bindInputs(range, input, onCreateFormChange);
    }
}

function bindPreviewScopeEvents() {
    window.addEventListener("biolab:selected-info-scope-change", () => refreshSelection(true));
    window.addEventListener("biolab:create-info-scope-change", event => {
        const detail = event.detail ?? {};
        const scope = detail.scope ?? state.createInfoScope ?? "general";
        const shouldFade = scope !== "general" && detail.fadeHighlight === true;

        if (scope === "general") {
            closeActiveOrganellePanel();
        } else if (_canOpenCreateOrganelle(scope)) {
            openOrganellePanel(scope);
        }
        syncCreateInfoPanel();

        if (shouldFade) {
            markCreatePreviewScopeSelected(scope);
        } else {
            syncCreatePreviewScopeSelectionWithoutFade(scope);
        }
        drawCreateCellPreview();
    });
}

function _canOpenCreateOrganelle(scope) {
    // Panels must be available even for disabled optional organelles,
    // because the user needs the panel itself to enable/configure them.
    return Boolean(scope && scope !== "general");
}

// ── Canvas-события ────────────────────────────────────────────────────────────

function bindCanvasEvents() {
    bindCanvasCameraEvents();
    dom.canvas.addEventListener("click", onCanvasClick);
    bindCanvasMouseEvents(dom.canvas);
}

// ── Клавиатура ────────────────────────────────────────────────────────────────

function bindKeyboardEvents() {
    document.addEventListener("keydown", event => {
        if (event.repeat || _isTypingTarget(event.target)) return;

        if (event.key === "Escape") {
            if (state.placeMode) {
                setPlaceMode(false);
                return;
            }
            if (hasActiveOrganellePanel()) {
                setCreateInfoScope("general");
                window.dispatchEvent(new CustomEvent("biolab:create-info-scope-change", {detail: {scope: "general"}}));
                return;
            }
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







