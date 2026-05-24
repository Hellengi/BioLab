import { dom } from "../dom.js";
import { deleteWorld, getConfig, getWorlds, loadWorld, saveWorld } from "../../transport/api/simulation.js";
import { render } from "../../render/canvas.js";
import { openModal, closeModal } from "./_panels.js";
import {state} from "../../store/state.js";
import {applySimulationConfig, resetClientState, updateStats} from "../../store/actions.js";

async function refreshWorldList() {
    const worlds = await getWorlds();
    if (!dom.worldSnapshotsList) return;

    dom.worldSnapshotsList.innerHTML = "";
    for (const world of worlds) {
        const option = document.createElement("option");
        option.value = String(world.id);
        option.textContent = `${world.name} (${formatDate(world.createdAt)})`;
        dom.worldSnapshotsList.appendChild(option);
    }
}

export function openSaveWorldModal() {
    if (dom.saveWorldNameInput) dom.saveWorldNameInput.value = "";
    openModal(dom.saveWorldModal);
}

export async function openLoadWorldModal() {
    await refreshWorldList();
    openModal(dom.loadWorldModal);
}

export async function confirmSaveWorld() {
    const name = dom.saveWorldNameInput?.value.trim();
    if (!name) { alert("Enter world name"); return; }

    await saveWorld(name);
    closeModal(dom.saveWorldModal);
}

export async function confirmLoadWorld() {
    const selectedId = dom.worldSnapshotsList?.value;
    if (!selectedId) { alert("Select a saved world"); return; }

    await loadWorld(selectedId);
    state.config = await getConfig();
    applySimulationConfig();
    resetClientState();
    render(dom.ctx, state);
    updateStats();
    closeModal(dom.loadWorldModal);
}

export async function deleteSelectedWorld() {
    const selectedId = dom.worldSnapshotsList?.value;
    if (!selectedId) { alert("Select a world to delete"); return; }
    if (!confirm("Delete the selected world?")) return;

    await deleteWorld(selectedId);
    await refreshWorldList();
}

function formatDate(value) {
    return new Date(value).toLocaleString();
}