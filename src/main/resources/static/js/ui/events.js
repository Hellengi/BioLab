import { dom } from "./dom.js";
import {
    handleSimulationReset,
    togglePause,
    startSliderDrag,
    endSliderDrag,
    updateTimeLocal,
} from "../store/store.js";
import { openSettings, closeSettings, saveSettings, resetSettings, bindSettingsForm }
    from "./panels/settingsPanel.js";
import { saveCurrentWorld, loadSelectedWorld, deleteSelectedWorld }
    from "./panels/snapshotPanel.js";
import { saveSelectedTemplate, saveDraftTemplate, loadSelectedTemplate, deleteSelectedTemplate }
    from "./panels/templatesPanel.js";
import { onStartCreateCell, onCancelCreateCell, enableCellPlacement, onCreateFormChange, createCellFields }
    from "./panels/creationPanel.js";
import { onCanvasClick }
    from "./panels/canvasController.js";
import { bindInputs } from "./panels.js";

export function bindEvents() {
    bindToolbarEvents();
    bindSettingsEvents();
    bindWorldEvents();
    bindTemplateEvents();
    bindCreatePanelEvents();
    bindCanvasEvents();
    bindCreateFormEvents();
    bindSettingsForm();
    bindSidebarToggle();
}

function bindToolbarEvents() {
    dom.timeSlider.addEventListener("pointerdown", () => startSliderDrag());
    dom.timeSlider.addEventListener("input", () => updateTimeLocal(dom.timeSlider.value));
    dom.timeSlider.addEventListener("pointerup", () => endSliderDrag(dom.timeSlider.value));

    dom.timeSlider.addEventListener("touchend", () => endSliderDrag(dom.timeSlider.value), { passive: true });

    dom.pauseBtn.addEventListener("click", () => togglePause());

    bindAsyncClick(dom.resetBtn, handleSimulationReset,
        "Reset simulation error", "Не удалось сбросить симуляцию");
}

function bindSettingsEvents() {
    dom.settingsBtn.addEventListener("click", () =>
        openSettings().catch(err => {
            console.error("Open settings error", err);
            alert("Failed to open settings");
        })
    );

    dom.cancelSettingsBtn?.addEventListener("click", closeSettings);

    dom.settingsOverlay.addEventListener("click", (event) => {
        if (event.target === dom.settingsOverlay) closeSettings();
    });

    bindAsyncClick(dom.saveSettingsBtn, saveSettings, "Save settings error", "Не удалось сохранить настройки");
    bindAsyncClick(dom.resetSettingsBtn, resetSettings, "Reset settings error", "Не удалось сбросить настройки");
}

function bindWorldEvents() {
    bindAsyncClick(dom.saveEnvironmentBtn, saveCurrentWorld, "Save world error", "Не удалось сохранить мир");
    bindAsyncClick(dom.loadSelectedWorldBtn, loadSelectedWorld, "Load world error", "Не удалось загрузить мир");
    bindAsyncClick(dom.deleteSelectedWorldBtn, deleteSelectedWorld, "Delete world error", "Не удалось удалить мир");
}

function bindTemplateEvents() {
    bindAsyncClick(dom.saveSelectedCellBtn, saveSelectedTemplate, "Save selected cell error", "Не удалось сохранить клетку");
    bindAsyncClick(dom.saveCreateTemplateBtn, saveDraftTemplate, "Save draft template error", "Не удалось сохранить шаблон");
    bindAsyncClick(dom.loadCellTemplateBtn, loadSelectedTemplate, "Load cell template error", "Не удалось загрузить шаблон клетки");
    bindAsyncClick(dom.deleteCellTemplateBtn, deleteSelectedTemplate, "Delete cell template error", "Не удалось удалить шаблон клетки");
}

function bindCreatePanelEvents() {
    dom.startCreateCellBtn?.addEventListener("click", () =>
        onStartCreateCell().catch(err => {
            console.error("Start create cell error", err);
            alert("Failed to load simulation settings");
        })
    );

    dom.cancelCreateCellBtn?.addEventListener("click", onCancelCreateCell);

    dom.placeCellModeBtn?.addEventListener("click", () => {
        try {
            enableCellPlacement();
        } catch (err) {
            console.error("Failed to enable cell placement mode", err);
            alert("Failed to start cell placement");
        }
    });
}

function bindCanvasEvents() {
    dom.canvas.addEventListener("click", onCanvasClick);
}

function bindCreateFormEvents() {
    for (const { range, input } of createCellFields) {
        bindInputs(range, input, onCreateFormChange);
    }
}

function bindSidebarToggle() {
    const sidebar = document.querySelector(".cell-sidebar");
    if (!dom.sidebarToggleBtn || !sidebar) return;

    dom.sidebarToggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("sidebar-open");
    });

    document.addEventListener("click", (event) => {
        if (
            sidebar.classList.contains("sidebar-open") &&
            !sidebar.contains(event.target) &&
            event.target !== dom.sidebarToggleBtn
        ) {
            sidebar.classList.remove("sidebar-open");
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