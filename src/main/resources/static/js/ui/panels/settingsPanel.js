import { state, updateStats, applySimulationConfig } from "../../store/store.js";
import { resetConfig, updateConfig } from "../../transport/api/simulationApi.js";
import { dom } from "../dom.js";
import { bindInputs } from "../panels.js";

export async function loadSettingsIntoPanel() {
    if (!state.config) return;
    setSliderAndInput(dom.initialCellCountSlider, dom.initialCellCountValue, state.config.initialCellCount);
    setSliderAndInput(dom.foodSpawnRateSlider, dom.foodSpawnRateValue, state.config.foodSpawnIntensity);
    setSliderAndInput(dom.deadCellLifetimeTicksSlider, dom.deadCellLifetimeTicksValue, state.config.deadCellLifetimeTicks);
}

export async function resetSettings() {
    state.config = await resetConfig();
    loadSettingsIntoPanel();
    applySimulationConfig();
    updateStats();
}

export function bindSettingsForm() {
    bindLiveSetting(dom.initialCellCountSlider, dom.initialCellCountValue, "initialCellCount");
    bindLiveSetting(dom.foodSpawnRateSlider, dom.foodSpawnRateValue, "foodSpawnIntensity",
        value => Math.max(0, Math.min(100, value))
    );
    bindLiveSetting(dom.deadCellLifetimeTicksSlider, dom.deadCellLifetimeTicksValue, "deadCellLifetimeTicks");
}

function setSliderAndInput(slider, input, value) {
    if (slider) slider.value = String(value);
    if (input) input.value = String(value);
}

function bindLiveSetting(rangeInput, numberInput, key, normalize = v => v) {
    bindInputs(rangeInput, numberInput, async () => {
        if (!state.config) return;
        const value = normalize(Number(numberInput?.value));
        if (rangeInput) rangeInput.value = String(value);
        if (numberInput) numberInput.value = String(value);

        const payload = { ...state.config, [key]: value };
        try {
            state.config = await updateConfig(payload);
            updateStats();
        } catch (err) {
            console.error("Failed to update config", err);
        }
    });
}