/**
 * SavesPanel.js — сохранение и загрузка миров.
 */

import { dom } from "../dom.js";
import { state, applySimulationConfig, resetClientState, updateStats } from "../../store/SimulationStore.js";
import { deleteWorld, getConfig, getWorlds, loadWorld, saveWorld } from "../../transport/api/simulation.js";
import { render } from "../../render/canvas.js";
import { closeSettings } from "./SettingsPanel.js";

export async function loadWorlds() {
    const worlds = await getWorlds();
    if (!dom.environmentSnapshotsList) return;

    dom.environmentSnapshotsList.innerHTML = "";
    for (const world of worlds) {
        const option = document.createElement("option");
        option.value = String(world.id);
        option.textContent = `${world.name} (${formatDate(world.createdAt)})`;
        dom.environmentSnapshotsList.appendChild(option);
    }
}

export async function saveCurrentWorld() {
    const name = dom.environmentNameInput?.value.trim();
    if (!name) { alert("Enter environment name"); return; }

    await saveWorld(name);
    await loadWorlds();
}

export async function loadSelectedWorld() {
    const selectedId = dom.environmentSnapshotsList?.value;
    if (!selectedId) { alert("Select a saved environment"); return; }

    await loadWorld(selectedId);
    state.config = await getConfig();
    applySimulationConfig();
    resetClientState();
    render(dom.ctx, state);
    updateStats();
    closeSettings();
}

export async function deleteSelectedWorld() {
    const selectedId = dom.environmentSnapshotsList?.value;
    if (!selectedId) { alert("Select an environment to delete"); return; }
    if (!confirm("Delete the selected environment?")) return;

    await deleteWorld(selectedId);
    await loadWorlds();
}

export function formatDate(value) {
    return new Date(value).toLocaleString();
}