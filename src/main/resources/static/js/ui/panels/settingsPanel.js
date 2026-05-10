import { state, updateStats, applySimulationConfig } from "../../store/store.js";
import { resetConfig, updateConfig } from "../../transport/api/simulationApi.js";
import { dom } from "../dom.js";
import { bindInputs } from "../panels.js";

const ORBIT_SPEED_EXPONENT = 2.0;
const CONFIG_UPDATE_DEBOUNCE_MS = 10;

let configUpdateTimer = null;
let configUpdateInFlight = false;
let pendingConfigPatch = {};

function scheduleConfigPatch(patch, immediate = false) {
    if (!state.config) return;

    pendingConfigPatch = {
        ...pendingConfigPatch,
        ...patch
    };

    state.config = {
        ...state.config,
        ...patch
    };

    if (configUpdateTimer) {
        clearTimeout(configUpdateTimer);
        configUpdateTimer = null;
    }

    if (immediate) {
        void flushConfigPatch();
        return;
    }

    configUpdateTimer = setTimeout(() => {
        configUpdateTimer = null;
        void flushConfigPatch();
    }, CONFIG_UPDATE_DEBOUNCE_MS);
}

async function flushConfigPatch() {
    if (!state.config || configUpdateInFlight) return;

    const patch = pendingConfigPatch;
    pendingConfigPatch = {};

    if (Object.keys(patch).length === 0) return;

    configUpdateInFlight = true;

    try {
        const response = await updateConfig({
            ...state.config,
            ...patch
        });

        state.config = {
            ...response,
            ...pendingConfigPatch
        };

        updateStats();
    } catch (err) {
        console.error("Failed to update config", err);
    } finally {
        configUpdateInFlight = false;

        if (Object.keys(pendingConfigPatch).length > 0) {
            void flushConfigPatch();
        }
    }
}

export async function loadSettingsIntoPanel() {
    if (!state.config) return;

    applyConfiguredRanges();

    setSliderAndInput(dom.initialCellCountSlider, dom.initialCellCountValue, controlValue("initialCellCount"));
    setSliderAndInput(dom.foodSpawnRateSlider, dom.foodSpawnRateValue, controlValue("foodSpawnIntensity"));
    setSliderAndInput(dom.viscositySlider, dom.viscosityValue, controlValue("viscositySlider"));
    setSliderAndInput(dom.turbiditySlider, dom.turbidityValue, controlValue("turbiditySlider"));
    setSliderAndInput(dom.gravitySlider, dom.gravityValue, controlValue("gravitySlider"));
    setSliderAndInput(dom.radiationSlider, dom.radiationValue, controlValue("radiationSlider"));
    setSliderAndInput(dom.globalLightSlider, dom.globalLightValue, controlValue("globalLightPercent"));

    setSliderAndInput(
        dom.globalLightCycleMinSlider,
        dom.globalLightCycleMinValue,
        controlValue("globalLightCycleMinPercent")
    );

    const period = Math.round(controlValue("globalLightCyclePeriodSeconds"));
    setSliderAndInput(
        dom.globalLightCyclePeriodSlider,
        null,
        inverseCurveLeftDense(period, getRange("globalLightCyclePeriodSeconds"))
    );

    if (dom.globalLightCyclePeriodValue) {
        dom.globalLightCyclePeriodValue.value = String(period);
    }

    if (dom.globalLightCycleEnabled) {
        dom.globalLightCycleEnabled.checked = !!state.config.globalLightCycleEnabled;
    }

    applyLightCycleFieldsVisibility(!!state.config.globalLightCycleEnabled);

    if (dom.localLightSourcesEnabled) {
        dom.localLightSourcesEnabled.checked = !!state.config.localLightSourcesEnabled;
    }

    applyLocalLightSourceFieldsVisibility(!!state.config.localLightSourcesEnabled);

    setDiscreteSlider(dom.lightSourceCountSlider, controlValue("lightSourceCount"));
    setAngleSlider(dom.lightSourceStartAngleSlider, controlValue("lightSourceStartAngle"));
    setSliderAndInput(dom.lightSourceBrightnessSlider, dom.lightSourceBrightnessValue, controlValue("lightSourceBrightness"));
    setSliderAndInput(dom.lightSourceOrbitRadiusSlider, dom.lightSourceOrbitRadiusValue, controlValue("lightSourceOrbitRadius"));
    setSliderAndInput(dom.lightSourceOrbitSpeedSlider, dom.lightSourceOrbitSpeedValue, controlValue("lightSourceOrbitSpeed"));
}

function applyConfiguredRanges() {
    applyControlRange(dom.initialCellCountSlider, dom.initialCellCountValue, "initialCellCount");
    applyControlRange(dom.foodSpawnRateSlider, dom.foodSpawnRateValue, "foodSpawnIntensity");
    applyControlRange(dom.viscositySlider, dom.viscosityValue, "viscositySlider");
    applyControlRange(dom.turbiditySlider, dom.turbidityValue, "turbiditySlider");
    applyControlRange(dom.gravitySlider, dom.gravityValue, "gravitySlider");
    applyControlRange(dom.radiationSlider, dom.radiationValue, "radiationSlider");
    applyControlRange(dom.globalLightSlider, dom.globalLightValue, "globalLightPercent");
    applyControlRange(dom.globalLightCycleMinSlider, dom.globalLightCycleMinValue, "globalLightCycleMinPercent");
    applyLeftDenseRange(dom.globalLightCyclePeriodSlider, dom.globalLightCyclePeriodValue, "globalLightCyclePeriodSeconds");
    applyControlRange(dom.lightSourceCountSlider, null, "lightSourceCount");
    applyControlRange(dom.lightSourceStartAngleSlider, null, "lightSourceStartAngle");
    applyControlRange(dom.lightSourceBrightnessSlider, dom.lightSourceBrightnessValue, "lightSourceBrightness");
    applyControlRange(dom.lightSourceOrbitRadiusSlider, dom.lightSourceOrbitRadiusValue, "lightSourceOrbitRadius");
    applyControlRange(dom.lightSourceOrbitSpeedSlider, dom.lightSourceOrbitSpeedValue, "lightSourceOrbitSpeed");

    renderDiscreteTicks(dom.lightSourceCountTicks, getRange("lightSourceCount"));
    renderAngleTicks(dom.lightSourceStartAngleTicks, getRange("lightSourceStartAngle"));
}

export async function resetSettings() {
    state.config = await resetConfig();
    await loadSettingsIntoPanel();
    applySimulationConfig();
    updateStats();
}

export function bindSettingsForm() {
    bindLiveSetting(dom.initialCellCountSlider, dom.initialCellCountValue, "initialCellCount",
        value => Math.round(clampByRange(value, getRange("initialCellCount")))
    );

    bindLiveSetting(dom.foodSpawnRateSlider, dom.foodSpawnRateValue, "foodSpawnIntensity",
        value => Math.round(clampByRange(value, getRange("foodSpawnIntensity")))
    );

    bindLiveSetting(dom.viscositySlider, dom.viscosityValue, "viscositySlider",
        value => Math.round(clampByRange(value, getRange("viscositySlider")))
    );

    bindLiveSetting(dom.turbiditySlider, dom.turbidityValue, "turbiditySlider",
        value => Math.round(clampByRange(value, getRange("turbiditySlider")))
    );

    bindLiveSetting(dom.gravitySlider, dom.gravityValue, "gravitySlider",
        value => Math.round(clampByRange(value, getRange("gravitySlider")))
    );

    bindLiveSetting(dom.radiationSlider, dom.radiationValue, "radiationSlider",
        value => Math.round(clampByRange(value, getRange("radiationSlider")))
    );

    bindPercentSetting(
        dom.globalLightSlider,
        dom.globalLightValue,
        "globalLightPercent",
        "globalLightPercent"
    );

    bindGlobalLightCycle();
    bindLocalLightSources();

    bindDiscreteSlider(
        dom.lightSourceCountSlider,
        "lightSourceCount",
        "lightSourceCount"
    );

    bindAngleSlider(
        dom.lightSourceStartAngleSlider,
        "lightSourceStartAngle",
        "lightSourceStartAngle"
    );

    bindLiveSetting(dom.lightSourceBrightnessSlider, dom.lightSourceBrightnessValue, "lightSourceBrightness",
        value => Math.round(clampByRange(value, getRange("lightSourceBrightness")))
    );

    bindLiveSetting(dom.lightSourceOrbitRadiusSlider, dom.lightSourceOrbitRadiusValue, "lightSourceOrbitRadius",
        value => Math.round(clampByRange(value, getRange("lightSourceOrbitRadius")))
    );

    bindOrbitSpeedSetting();
}

function control(key) {
    return state.config?.[key];
}

function controlValue(key, fallback = 0) {
    return Number(control(key)?.value ?? fallback);
}

function patchControl(key, value) {
    return {
        [key]: {
            ...control(key),
            value
        }
    };
}

function setSliderAndInput(slider, input, value) {
    if (slider) slider.value = String(value);
    if (input) {
        if (input.tagName === "INPUT") {
            input.value = String(value);
        } else {
            input.textContent = String(value);
        }
    }
}

function setDiscreteSlider(slider, value) {
    const normalized = Math.round(Number(value ?? 0));

    if (slider) slider.value = String(normalized);

    const label = document.getElementById("lightSourceCountLabel");
    if (label) label.textContent = String(normalized);
}

function setAngleSlider(slider, value) {
    const angle = Number(value ?? 0);

    if (slider) slider.value = String(angle);

    if (dom.lightSourceStartAngleLabel) {
        dom.lightSourceStartAngleLabel.textContent = `${angle}°`;
    }
}

function getRange(key) {
    const range = control(key);

    if (!range) {
        console.error(`Missing control from backend: ${key}`);
        return null;
    }

    if (
        range.min == null ||
        range.max == null ||
        range.step == null ||
        range.initial == null
    ) {
        console.error(`Incomplete control from backend: ${key}`, range);
        return null;
    }

    return {
        min: Number(range.min),
        max: Number(range.max),
        step: Number(range.step),
        initial: Number(range.initial)
    };
}

function applyInputRange(input, range) {
    if (!input) return;

    input.min = String(range.min);
    input.max = String(range.max);
    input.step = String(range.step);
}

function applyControlRange(slider, input, key) {
    const range = getRange(key);
    if (!range) return null;

    applyInputRange(slider, range);
    applyInputRange(input, range);

    return range;
}

function applyLeftDenseRange(slider, input, rangeKey) {
    const range = getRange(rangeKey);
    if (!range) return null;

    if (slider) {
        slider.min = "0";
        slider.max = "100";
        slider.step = "1";
    }

    if (input) {
        input.min = String(range.min);
        input.max = String(range.max);
        input.step = String(range.step ?? 1);
    }

    return range;
}

function clampByRange(value, range) {
    if (!range) return Number(value);
    return Math.max(range.min, Math.min(range.max, value));
}

function renderDiscreteTicks(container, range) {
    if (!container) return;

    container.innerHTML = "";

    const min = Math.round(range.min);
    const max = Math.round(range.max);

    for (let value = min; value <= max; value++) {
        const tick = document.createElement("span");
        tick.textContent = String(value);
        container.appendChild(tick);
    }
}

function renderAngleTicks(container, range) {
    if (!container) return;

    container.innerHTML = "";

    const min = Math.round(range.min);
    const max = Math.round(range.max);
    const step = Math.max(1, Math.round(range.step));

    for (let value = min; value <= max; value += step) {
        const tick = document.createElement("span");
        tick.textContent = `${value}°`;
        container.appendChild(tick);
    }
}

function bindGlobalLightCycle() {
    dom.globalLightCycleEnabled?.addEventListener("change", async () => {
        if (!state.config) return;

        const enabled = dom.globalLightCycleEnabled.checked;
        applyLightCycleFieldsVisibility(enabled);

        const maxPercent = controlValue("globalLightPercent", getRange("globalLightPercent").initial);
        const minPercent = Math.min(
            controlValue("globalLightCycleMinPercent", getRange("globalLightCycleMinPercent").initial),
            maxPercent
        );

        state.config = await updateConfig({
            ...state.config,
            globalLightCycleEnabled: enabled,
            ...patchControl("globalLightCycleMinPercent", minPercent),
            ...patchControl(
                "globalLightCyclePeriodSeconds",
                controlValue(
                    "globalLightCyclePeriodSeconds",
                    getRange("globalLightCyclePeriodSeconds").initial
                )
            ),
            globalLightCycleElapsedTicks: state.config.globalLightCycleElapsedTicks ?? 0
        });

        await loadSettingsIntoPanel();
        updateStats();
    });

    bindCycleMinLight(
        dom.globalLightCycleMinSlider,
        dom.globalLightCycleMinValue
    );

    bindLeftDenseSetting(
        dom.globalLightCyclePeriodSlider,
        dom.globalLightCyclePeriodValue,
        "globalLightCyclePeriodSeconds",
        "globalLightCyclePeriodSeconds"
    );
}

function applyLightCycleFieldsVisibility(enabled) {
    if (!dom.lightCycleFields) return;
    dom.lightCycleFields.classList.toggle("hidden", !enabled);
}

function bindLocalLightSources() {
    dom.localLightSourcesEnabled?.addEventListener("change", async () => {
        if (!state.config) return;

        const enabled = dom.localLightSourcesEnabled.checked;
        applyLocalLightSourceFieldsVisibility(enabled);

        state.config = await updateConfig({
            ...state.config,
            localLightSourcesEnabled: enabled,
            ...patchControl(
                "lightSourceCount",
                controlValue("lightSourceCount", getRange("lightSourceCount").initial)
            ),
            ...patchControl(
                "lightSourceStartAngle",
                controlValue("lightSourceStartAngle", getRange("lightSourceStartAngle").initial)
            )
        });

        await loadSettingsIntoPanel();
        updateStats();
    });
}

function applyLocalLightSourceFieldsVisibility(enabled) {
    if (!dom.localLightSourceFields) return;
    dom.localLightSourceFields.classList.toggle("hidden", !enabled);
}

function bindCycleMinLight(rangeInput, numberInput) {
    const apply = immediate => {
        if (!state.config) return;

        const raw = numberInput?.tagName === "INPUT"
            ? Number(numberInput.value)
            : Number(rangeInput?.value);

        const minPercent = Math.round(clampByRange(
            raw,
            getRange("globalLightCycleMinPercent")
        ));

        const globalPercent = Math.round(controlValue("globalLightPercent", 100));
        const patch = {
            ...patchControl("globalLightCycleMinPercent", minPercent)
        };

        if (minPercent > globalPercent) {
            Object.assign(patch, patchControl("globalLightPercent", minPercent));
            setSliderAndInput(
                dom.globalLightSlider,
                dom.globalLightValue,
                minPercent
            );
        }

        setSliderAndInput(rangeInput, numberInput, minPercent);
        scheduleConfigPatch(patch, immediate);
    };

    bindInputs(
        rangeInput,
        numberInput,
        () => apply(false),
        () => apply(true)
    );
}

function bindPercentSetting(rangeInput, numberInput, key, rangeKey = key) {
    const apply = immediate => {
        if (!state.config) return;

        const raw = numberInput?.tagName === "INPUT"
            ? Number(numberInput.value)
            : Number(rangeInput?.value);

        const percent = Math.round(clampByRange(raw, getRange(rangeKey)));
        const patch = {
            ...patchControl(key, percent)
        };

        if (key === "globalLightPercent") {
            const currentMinPercent = Math.round(controlValue("globalLightCycleMinPercent", 0));

            if (percent < currentMinPercent) {
                Object.assign(patch, patchControl("globalLightCycleMinPercent", percent));
                setSliderAndInput(
                    dom.globalLightCycleMinSlider,
                    dom.globalLightCycleMinValue,
                    percent
                );
            }
        }

        setSliderAndInput(rangeInput, numberInput, percent);
        scheduleConfigPatch(patch, immediate);
    };

    bindInputs(
        rangeInput,
        numberInput,
        () => apply(false),
        () => apply(true)
    );
}

function bindLiveSetting(rangeInput, numberInput, key, normalize = v => v) {
    const apply = immediate => {
        if (!state.config) return;

        const raw = numberInput?.tagName === "INPUT"
            ? Number(numberInput.value)
            : Number(rangeInput?.value);

        const value = normalize(raw);

        if (rangeInput) rangeInput.value = String(value);
        if (numberInput) {
            if (numberInput.tagName === "INPUT") numberInput.value = String(value);
            else numberInput.textContent = String(value);
        }

        scheduleConfigPatch(patchControl(key, value), immediate);
    };

    bindInputs(
        rangeInput,
        numberInput,
        () => apply(false),
        () => apply(true)
    );
}

function bindDiscreteSlider(slider, key, rangeKey) {
    if (!slider) return;

    const apply = immediate => {
        if (!state.config) return;

        const range = getRange(rangeKey);
        const value = Math.round(clampByRange(Number(slider.value), range));

        setDiscreteSlider(slider, value);
        scheduleConfigPatch(patchControl(key, value), immediate);
    };

    slider.addEventListener("input", () => apply(false));
    slider.addEventListener("change", () => apply(true));
    slider.addEventListener("pointerup", () => apply(true));
}

function bindAngleSlider(slider, key, rangeKey) {
    if (!slider) return;

    const apply = immediate => {
        if (!state.config) return;

        const range = getRange(rangeKey);
        const step = Math.max(1, Math.round(range.step));
        const raw = Math.round(clampByRange(Number(slider.value), range));
        const value = Math.round(raw / step) * step;

        setAngleSlider(slider, value);
        scheduleConfigPatch(patchControl(key, value), immediate);
    };

    slider.addEventListener("input", () => apply(false));
    slider.addEventListener("change", () => apply(true));
    slider.addEventListener("pointerup", () => apply(true));
}

function curveSignedPercent(rawValue) {
    const raw = Math.max(-100, Math.min(100, Math.round(Number(rawValue) || 0)));
    const sign = Math.sign(raw);
    const normalized = Math.abs(raw) / 100;

    return Math.round(sign * Math.pow(normalized, ORBIT_SPEED_EXPONENT) * 100);
}

function inverseCurveSignedPercent(value) {
    const v = Math.max(-100, Math.min(100, Math.round(Number(value) || 0)));
    const sign = Math.sign(v);
    const normalized = Math.abs(v) / 100;

    return Math.round(sign * Math.pow(normalized, 1 / ORBIT_SPEED_EXPONENT) * 100);
}

function bindOrbitSpeedSetting() {
    const slider = dom.lightSourceOrbitSpeedSlider;
    const input = dom.lightSourceOrbitSpeedValue;

    if (!slider || !input) return;

    slider.addEventListener("input", () => {
        const curvedValue = curveSignedPercent(slider.value);

        input.value = String(curvedValue);
        applyOrbitSpeedSetting(curvedValue, false);
    });

    input.addEventListener("change", () => {
        const curvedValue = Math.max(-100, Math.min(100, Math.round(Number(input.value) || 0)));
        const rawSliderValue = inverseCurveSignedPercent(curvedValue);

        input.value = String(curvedValue);
        slider.value = String(rawSliderValue);
        applyOrbitSpeedSetting(curvedValue, true);
    });

    slider.addEventListener("change", () => {
        const curvedValue = curveSignedPercent(slider.value);
        input.value = String(curvedValue);
        applyOrbitSpeedSetting(curvedValue, true);
    });

    slider.addEventListener("pointerup", () => {
        const curvedValue = curveSignedPercent(slider.value);
        input.value = String(curvedValue);
        applyOrbitSpeedSetting(curvedValue, true);
    });
}

function applyOrbitSpeedSetting(value, immediate = false) {
    if (!state.config) return;

    scheduleConfigPatch(
        patchControl("lightSourceOrbitSpeed", value),
        immediate
    );
}

function curveLeftDense(rawValue, range) {
    if (!range) return 0;

    const raw = Math.max(0, Math.min(100, Math.round(Number(rawValue) || 0)));
    const t = raw / 100.0;

    return Math.round(range.min + t * t * (range.max - range.min));
}

function inverseCurveLeftDense(value, range) {
    if (!range) return 0;

    const v = Math.max(range.min, Math.min(range.max, Number(value) || range.min));
    const span = Math.max(1, range.max - range.min);

    return Math.round(Math.sqrt((v - range.min) / span) * 100);
}

function bindLeftDenseSetting(slider, input, key, rangeKey) {
    if (!slider || !input) return;

    const apply = immediate => {
        if (!state.config) return;

        const range = getRange(rangeKey);
        if (!range) return;
        const rawValue = input === document.activeElement
            ? Number(input.value)
            : curveLeftDense(slider.value, range);

        const curvedValue = Math.round(clampByRange(rawValue, range));
        const rawSliderValue = inverseCurveLeftDense(curvedValue, range);

        input.value = String(curvedValue);
        slider.value = String(rawSliderValue);

        scheduleConfigPatch(
            patchControl(key, curvedValue),
            immediate
        );
    };

    slider.addEventListener("input", () => apply(false));
    slider.addEventListener("change", () => apply(true));
    slider.addEventListener("pointerup", () => apply(true));
    input.addEventListener("change", () => apply(true));
}