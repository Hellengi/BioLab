
/**
 * ui/tabs/settings.js
 * Публичный API панели настроек симуляции.
 *
 * Экспортирует:
 *   loadSettingsIntoPanel — загружает значения из конфига в UI
 *   resetSettings         — сбрасывает к дефолтным значениям
 *   bindSettingsForm      — привязывает все элементы формы к конфигу
 *
 * Вся инфраструктура (дебаунс, кривые, range-утилиты, биндеры) —
 * в соседнем файле _settings-helpers.js.
 */

import { resetConfig, updateConfig } from "../../transport/api/simulation.js";
import { dom } from "../dom.js";
import { state } from "../../store/state.js";
import { applySimulationConfig, updateStats } from "../../store/actions.js";

import {
    controlValue,
    patchControl,
    getRange,
    clampByRange,
    setControlSliderAndInput,
    setDiscreteSlider,
    setAngleSlider,
    applyAllControlRanges,
    bindPercentControl,
    bindLiveControl,
    bindDiscreteControl,
    bindAngleControl,
    bindOrbitSpeedControl,
    bindCycleMinLightControl,
} from "./settings-helpers.js";

// ── Загрузка значений в панель ────────────────────────────────────────────────

/**
 * Читает state.config и выставляет все значения в элементы панели настроек.
 * Вызывать после получения конфига с сервера.
 */
export async function loadSettingsIntoPanel() {
    if (!state.config) return;

    applyAllControlRanges();

    setControlSliderAndInput(dom.initialCellCountSlider, dom.initialCellCountValue, "initialCellCount");
    setControlSliderAndInput(dom.foodSpawnRateSlider, dom.foodSpawnRateValue, "foodSpawnIntensity");
    setControlSliderAndInput(dom.viscositySlider, dom.viscosityValue, "viscositySlider");
    setControlSliderAndInput(dom.turbiditySlider, dom.turbidityValue, "turbiditySlider");
    setControlSliderAndInput(dom.gravitySlider, dom.gravityValue, "gravitySlider");
    setControlSliderAndInput(dom.radiationSlider, dom.radiationValue, "radiationSlider");
    setControlSliderAndInput(dom.globalLightSlider, dom.globalLightValue, "globalLightPercent");
    setControlSliderAndInput(dom.globalLightCycleMinSlider, dom.globalLightCycleMinValue, "globalLightCycleMinPercent");

    setControlSliderAndInput(dom.globalLightCyclePeriodSlider, dom.globalLightCyclePeriodValue, "globalLightCyclePeriodSeconds");

    if (dom.globalLightCycleEnabled) {
        dom.globalLightCycleEnabled.checked = !!state.config.globalLightCycleEnabled;
    }
    _applyLightCycleVisibility(!!state.config.globalLightCycleEnabled);

    if (dom.localLightSourcesEnabled) {
        dom.localLightSourcesEnabled.checked = !!state.config.localLightSourcesEnabled;
    }
    _applyLocalLightSourceVisibility(!!state.config.localLightSourcesEnabled);

    setDiscreteSlider(dom.lightSourceCountSlider,      controlValue("lightSourceCount"));
    setAngleSlider   (dom.lightSourceStartAngleSlider, controlValue("lightSourceStartAngle"));
    setControlSliderAndInput(dom.lightSourceBrightnessSlider, dom.lightSourceBrightnessValue, "lightSourceBrightness");
    setControlSliderAndInput(dom.lightSourceOrbitRadiusSlider, dom.lightSourceOrbitRadiusValue, "lightSourceOrbitRadius");
    setControlSliderAndInput(dom.lightSourceOrbitSpeedSlider, dom.lightSourceOrbitSpeedValue, "lightSourceOrbitSpeed");
}

// ── Сброс к дефолтам ─────────────────────────────────────────────────────────

export async function resetSettings() {
    state.config = await resetConfig();
    await loadSettingsIntoPanel();
    applySimulationConfig();
    updateStats();
}

// ── Привязка формы ────────────────────────────────────────────────────────────

/**
 * Вешает обработчики на все элементы формы настроек.
 * Вызывать один раз при инициализации страницы.
 */
export function bindSettingsForm() {
    _bindEnvironmentControls();
    _bindLightingControls();
    bindGlobalLightCycle();
    bindLocalLightSources();
}

function _bindEnvironmentControls() {
    const roundClamp = (key) => (value) => Math.round(clampByRange(value, getRange(key)));

    bindLiveControl(dom.initialCellCountSlider, dom.initialCellCountValue, "initialCellCount",   roundClamp("initialCellCount"));
    bindLiveControl(dom.foodSpawnRateSlider,    dom.foodSpawnRateValue,    "foodSpawnIntensity",  roundClamp("foodSpawnIntensity"));
    bindLiveControl(dom.viscositySlider,        dom.viscosityValue,        "viscositySlider",     roundClamp("viscositySlider"));
    bindLiveControl(dom.turbiditySlider,        dom.turbidityValue,        "turbiditySlider",     roundClamp("turbiditySlider"));
    bindLiveControl(dom.gravitySlider,          dom.gravityValue,          "gravitySlider",       roundClamp("gravitySlider"));
    bindLiveControl(dom.radiationSlider,        dom.radiationValue,        "radiationSlider",     roundClamp("radiationSlider"));
}

function _bindLightingControls() {
    const roundClamp = (key) => (value) => Math.round(clampByRange(value, getRange(key)));

    bindPercentControl(dom.globalLightSlider, dom.globalLightValue, "globalLightPercent");

    bindDiscreteControl(dom.lightSourceCountSlider,       "lightSourceCount",       "lightSourceCount");
    bindAngleControl   (dom.lightSourceStartAngleSlider,  "lightSourceStartAngle",  "lightSourceStartAngle");

    bindLiveControl(dom.lightSourceBrightnessSlider,  dom.lightSourceBrightnessValue,  "lightSourceBrightness",  roundClamp("lightSourceBrightness"));
    bindLiveControl(dom.lightSourceOrbitRadiusSlider, dom.lightSourceOrbitRadiusValue, "lightSourceOrbitRadius", roundClamp("lightSourceOrbitRadius"));

    bindOrbitSpeedControl();
}

// ── Цикл дня/ночи ────────────────────────────────────────────────────────────

function bindGlobalLightCycle() {
    dom.globalLightCycleEnabled?.addEventListener("change", async () => {
        if (!state.config) return;

        const enabled = dom.globalLightCycleEnabled.checked;
        _applyLightCycleVisibility(enabled);

        const maxPercent = controlValue("globalLightPercent", getRange("globalLightPercent").initial);
        const minPercent = Math.min(
            controlValue("globalLightCycleMinPercent", getRange("globalLightCycleMinPercent").initial),
            maxPercent
        );

        state.config = await updateConfig({
            ...state.config,
            globalLightCycleEnabled: enabled,
            ...patchControl("globalLightCycleMinPercent", minPercent),
            ...patchControl("globalLightCyclePeriodSeconds",
                controlValue("globalLightCyclePeriodSeconds", getRange("globalLightCyclePeriodSeconds").initial)
            ),
        });

        await loadSettingsIntoPanel();
        updateStats();
    });

    bindCycleMinLightControl(dom.globalLightCycleMinSlider, dom.globalLightCycleMinValue);
    bindLiveControl(
        dom.globalLightCyclePeriodSlider,
        dom.globalLightCyclePeriodValue,
        "globalLightCyclePeriodSeconds",
        value => Math.round(clampByRange(value, getRange("globalLightCyclePeriodSeconds")))
    );
}

// ── Локальные источники света ─────────────────────────────────────────────────

function bindLocalLightSources() {
    dom.localLightSourcesEnabled?.addEventListener("change", async () => {
        if (!state.config) return;

        const enabled = dom.localLightSourcesEnabled.checked;
        _applyLocalLightSourceVisibility(enabled);

        state.config = await updateConfig({
            ...state.config,
            localLightSourcesEnabled: enabled,
            ...patchControl("lightSourceCount",
                controlValue("lightSourceCount", getRange("lightSourceCount").initial)
            ),
            ...patchControl("lightSourceStartAngle",
                controlValue("lightSourceStartAngle", getRange("lightSourceStartAngle").initial)
            ),
        });

        await loadSettingsIntoPanel();
        updateStats();
    });
}

// ── Приватные: управление видимостью полей ────────────────────────────────────

function _applyLightCycleVisibility(enabled) {
    dom.lightCycleFields?.classList.toggle("collapsed", !enabled);
}

function _applyLocalLightSourceVisibility(enabled) {
    dom.localLightSourceFields?.classList.toggle("collapsed", !enabled);
}




