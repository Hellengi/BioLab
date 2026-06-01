import { dom } from "../dom.js";
import { deleteTemplate, getTemplate, getTemplates, saveTemplate } from "../../transport/api/cell.js";
import { openModal, closeModal } from "./_panels.js";
import { readDraftFromForm, syncDraftToForm } from "../tabs/creation.js";
import { switchTab } from "../tabs/_tabs.js";
import {state} from "../../store/state.js";

async function refreshTemplateList() {
    const templates = await getTemplates();
    if (!dom.strainsList) return;

    dom.strainsList.innerHTML = "";
    for (const cell of templates) {
        const option = document.createElement("option");
        option.value = String(cell.id);
        option.textContent = cell.name;
        dom.strainsList.appendChild(option);
    }
}


export async function confirmSaveSelectedCell() {
    if (!state.selectedStrain) return;

    const name = dom.saveSelectedCellNameInput?.value.trim();
    if (!name) { alert("Enter template name"); return; }

    await saveTemplate(name, state.selectedStrain);
    closeModal(dom.saveSelectedCellModal);
}

export async function confirmSaveDraftCell() {
    let draft;
    try {
        draft = readDraftFromForm();
    } catch (err) {
        alert("Check the values in the cell creation form");
        return;
    }

    const name = dom.saveCellNameInput?.value.trim();
    if (!name) { alert("Enter template name"); return; }

    await saveTemplate(name, draft);
    closeModal(dom.saveCellModal);
}

export async function openLoadCellModal() {
    await refreshTemplateList();
    openModal(dom.loadCellModal);
}

export async function confirmLoadCell() {
    const selectedId = dom.strainsList?.value;
    if (!selectedId) { alert("Select a cell template"); return; }

    state.cellDraft = await getTemplate(selectedId);
    syncDraftToForm();
    closeModal(dom.loadCellModal);
    switchTab("create");
}

export async function deleteSelectedTemplate() {
    const selectedId = dom.strainsList?.value;
    if (!selectedId) { alert("Select a template to delete"); return; }
    if (!confirm("Delete the selected template?")) return;

    await deleteTemplate(selectedId);
    await refreshTemplateList();
}
