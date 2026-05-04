/**
 * SettingsPanel.js — диалог настроек симуляции.
 */

import { state, updateStats } from "../../store/SimulationStore.js";
import { resetConfig, updateConfig } from "../../transport/api/simulation.js";
import { loadWorlds } from "./SnapshotPanel.js";
import { dom } from "../dom.js";
import { bindInputs } from "../ui.js";

export async function openSettings() {
    if (!state.config) return;

    state.settingsDraft = {
        initialCellCount:    state.config.initialCellCount,
        foodSpawnIntensity:  state.config.foodSpawnIntensity,
        deadCellLifetimeTicks: state.config.deadCellLifetimeTicks,
    };

    syncSettingsFormFromDraft();
    await loadWorlds();
    dom.settingsOverlay.classList.remove("hidden");
}

export function closeSettings() {
    dom.settingsOverlay.classList.add("hidden");
}

export async function saveSettings() {
    if (!state.config || !state.settingsDraft) return;

    const payload = {
        ...state.config,
        initialCellCount:  state.settingsDraft.initialCellCount,
        foodSpawnIntensity: state.settingsDraft.foodSpawnIntensity,
        deadCellLifetimeTicks:   state.settingsDraft.deadCellLifetimeTicks,
    };

    state.config = await updateConfig(payload);
    closeSettings();
    updateStats();
}

export async function resetSettings() {
    state.config = await resetConfig();
    state.settingsDraft = {
        initialCellCount:  state.config.initialCellCount,
        foodSpawnIntensity: state.config.foodSpawnIntensity,
        deadCellLifetimeTicks:   state.config.deadCellLifetimeTicks,
    };
    syncSettingsFormFromDraft();
    updateStats();
}

export function bindSettingsForm() {
    bindSetting(dom.initialCellCountSlider, dom.initialCellCountValue, 'initialCellCount');
    bindSetting(dom.foodSpawnRateSlider,    dom.foodSpawnRateValue,    'foodSpawnIntensity',
        value => Math.max(0, Math.min(100, value))
    );
    bindSetting(dom.deadCellLifetimeTicksSlider, dom.deadCellLifetimeTicksValue, "deadCellLifetimeTicks");
}

function syncSettingsFormFromDraft() {
    if (!state.settingsDraft) return;

    setSliderAndInput(dom.initialCellCountSlider, dom.initialCellCountValue,
        state.settingsDraft.initialCellCount);
    setSliderAndInput(dom.foodSpawnRateSlider, dom.foodSpawnRateValue,
        state.settingsDraft.foodSpawnIntensity);
    setSliderAndInput(dom.deadCellLifetimeTicksSlider, dom.deadCellLifetimeTicksValue,
        state.settingsDraft.deadCellLifetimeTicks);
}

function setSliderAndInput(slider, input, value) {
    if (slider) slider.value = String(value);
    if (input)  input.value  = String(value);
}

function bindSetting(rangeInput, numberInput, key, normalize = v => v) {
    bindInputs(rangeInput, numberInput, () => {
        const value = normalize(Number(numberInput?.value));
        state.settingsDraft[key] = value;
        if (rangeInput) rangeInput.value = String(value);
        if (numberInput) numberInput.value = String(value);
    });
}