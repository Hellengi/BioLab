/**
 * events.js — тонкий диспетчер событий.
 *
 * Правила этого файла:
 *  - Только element.addEventListener(…).
 *  - Никакой бизнес-логики: расчётов координат, поиска клеток,
 *    управления режимами размещения — всё это в панелях/сторе.
 *  - Обработка ошибок: bindAsyncClick покрывает все async-действия.
 *
 * Если вы добавляете новое событие — вызывайте функцию из соответствующей панели,
 * не пишите логику прямо здесь.
 */

import { dom }                from "./dom.js";
import { startSimulation, stopSimulation } from "../transport/api/simulation.js";
import { handleSimulationReset, loadSimulationConfig, state } from "../store/SimulationStore.js";
import { openSettings, closeSettings, saveSettings, resetSettings, bindSettingsForm }
    from "./panels/SettingsPanel.js";
import { saveCurrentWorld, loadSelectedWorld, deleteSelectedWorld }
    from "./panels/SnapshotPanel.js";
import { saveSelectedTemplate, saveDraftTemplate, loadSelectedTemplate, deleteSelectedTemplate }
    from "./panels/TemplatesPanel.js";
import { onStartCreateCell, onCancelCreateCell, enableCellPlacement, onCreateFormChange, createCellFields }
    from "./panels/CreationPanel.js";
import { onCanvasClick }
    from "./panels/CanvasController.js";
import { bindInputs } from "./ui.js";

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function bindEvents() {
    bindToolbarEvents();
    bindSettingsEvents();
    bindWorldEvents();
    bindTemplateEvents();
    bindCreatePanelEvents();
    bindCanvasEvents();
    bindCreateFormEvents();
    bindSettingsForm();
}

// ---------------------------------------------------------------------------
// Private binders — каждый отвечает строго за свой блок UI
// ---------------------------------------------------------------------------

function bindToolbarEvents() {
    dom.startBtn.addEventListener("click", () => startSimulation());
    dom.stopBtn.addEventListener("click",  () => stopSimulation());

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

    bindAsyncClick(dom.saveSettingsBtn,  saveSettings,  "Save settings error",  "Не удалось сохранить настройки");
    bindAsyncClick(dom.resetSettingsBtn, resetSettings, "Reset settings error", "Не удалось сбросить настройки");
}

function bindWorldEvents() {
    bindAsyncClick(dom.saveEnvironmentBtn,          saveCurrentWorld,   "Save world error",   "Не удалось сохранить мир");
    bindAsyncClick(dom.loadSelectedWorldBtn,  loadSelectedWorld,  "Load world error",   "Не удалось загрузить мир");
    bindAsyncClick(dom.deleteSelectedWorldBtn, deleteSelectedWorld, "Delete world error", "Не удалось удалить мир");
}

function bindTemplateEvents() {
    bindAsyncClick(dom.saveSelectedCellBtn,  saveSelectedTemplate, "Save selected cell error",  "Не удалось сохранить клетку");
    bindAsyncClick(dom.saveCreateTemplateBtn, saveDraftTemplate,   "Save draft template error",  "Не удалось сохранить шаблон");
    bindAsyncClick(dom.loadCellTemplateBtn,  loadSelectedTemplate, "Load cell template error",   "Не удалось загрузить шаблон клетки");
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
    // Вся логика (режим размещения / выбор / снятие выбора) — в CanvasController
    dom.canvas.addEventListener("click", onCanvasClick);
}

function bindCreateFormEvents() {
    for (const { range, input } of createCellFields) {
        bindInputs(range, input, onCreateFormChange);
    }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Вешает async-обработчик с централизованной обработкой ошибок.
 * @param {HTMLElement | null} element
 * @param {() => Promise<void>} handler
 * @param {string} logMessage
 * @param {string} alertMessage
 */
function bindAsyncClick(element, handler, logMessage, alertMessage) {
    if (!element) return;
    element.addEventListener("click", () => {
        handler().catch(err => {
            console.error(logMessage, err);
            alert(alertMessage);
        });
    });
}