/**
 * TemplatesPanel.js — список сохранённых шаблонов клеток.
 */

import { dom } from "../dom.js";
import { state } from "../../store/SimulationStore.js";
import { deleteTemplate, getTemplate, getTemplates, saveTemplate } from "../../transport/api/cells.js";
import { showSidePanel, showToast, SidePanel } from "../ui.js";
import { readDraftForm, syncDraftForm } from "./CreationPanel.js";

export async function loadTemplates() {
    const templates = await getTemplates();
    if (!dom.cellTemplatesList) return;

    dom.cellTemplatesList.innerHTML = "";
    for (const cell of templates) {
        const option = document.createElement("option");
        option.value = String(cell.id);
        option.textContent = cell.name;
        dom.cellTemplatesList.appendChild(option);
    }
}

export async function saveSelectedTemplate() {
    if (!state.selectedCellTemplate) return;

    const name = dom.saveSelectedCellNameInput?.value.trim();
    if (!name) { alert("Enter cell template name"); return; }

    await saveTemplate(name, state.selectedCellTemplate);
    await loadTemplates();
    showToast(dom.saveSelectedCellSuccess);
}

export async function loadSelectedTemplate() {
    const selectedId = dom.cellTemplatesList?.value;
    if (!selectedId) { alert("Select a cell template"); return; }

    state.cellDraft = await getTemplate(selectedId);
    if (dom.createCellTemplateNameInput) {
        dom.createCellTemplateNameInput.value = state.cellDraft.name ?? "";
    }
    syncDraftForm();
    showSidePanel(SidePanel.CREATE);
}

export async function deleteSelectedTemplate() {
    const selectedId = dom.cellTemplatesList?.value;
    if (!selectedId) { alert("Select a cell template to delete"); return; }
    if (!confirm("Delete the selected cell template?")) return;

    await deleteTemplate(selectedId);
    await loadTemplates();
}

export async function saveDraftTemplate() {
    const name = dom.createCellTemplateNameInput?.value.trim();
    if (!name) { alert("Enter cell template name"); return; }

    const draft = readDraftForm();
    await saveTemplate(name, draft);
    await loadTemplates();
    showToast(dom.saveCreateTemplateSuccess);
}