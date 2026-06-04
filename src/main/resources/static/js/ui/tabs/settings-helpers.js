/**
 * ui/tabs/_settings-helpers.js
 * Внутренние вспомогательные модули для settings.js.
 * Содержит четыре независимых слоя:
 *  1. Config-sync   — дросселированная отправка патча конфига на сервер
 *  2. Range-utils   — работа с диапазонами (min/max/step) из конфига
 *  3. Slider UI     — синхронизация DOM-элементов со значениями
 *  4. Curve math    — нелинейные преобразования слайдеров
 *  5. Input binders — привязка конкретных типов слайдеров к конфигу
 */

import { state } from "../../store/state.js";
import { updateConfig } from "../../transport/api/simulation.js";
import { updateStats } from "../../store/actions.js";
import { dom } from "../dom.js";
import { bindInputs, applyInputBounds } from "../panels/_panels.js";

// ═══════════════════════════════════════════════════════════════════
// 1. CONFIG-SYNC — дросселированная запись конфига на сервер
// ═══════════════════════════════════════════════════════════════════

const CONFIG_UPDATE_DEBOUNCE_MS = 10;

let _configUpdateTimer    = null;
let _configUpdateInFlight = false;
let _pendingConfigPatch   = {};

/**
 * Планирует отправку патча конфига.
 * При immediate=true отправляет немедленно, иначе debounce.
 * @param {object} patch
 * @param {boolean} [immediate]
 */
function scheduleConfigPatch(patch, immediate = false) {
    if (!state.config) return;

    _pendingConfigPatch = { ..._pendingConfigPatch, ...patch };
    state.config        = { ...state.config, ...patch };

    if (_configUpdateTimer) {
        clearTimeout(_configUpdateTimer);
        _configUpdateTimer = null;
    }

    if (immediate) {
        void _flushConfigPatch();
        return;
    }

    _configUpdateTimer = setTimeout(() => {
        _configUpdateTimer = null;
        void _flushConfigPatch();
    }, CONFIG_UPDATE_DEBOUNCE_MS);
}

async function _flushConfigPatch() {
    if (!state.config || _configUpdateInFlight) return;

    const patch = _pendingConfigPatch;
    _pendingConfigPatch = {};

    if (Object.keys(patch).length === 0) return;

    _configUpdateInFlight = true;

    try {
        const response = await updateConfig({ ...state.config, ...patch });
        state.config   = { ...response, ..._pendingConfigPatch };
        updateStats();
    } catch (err) {
        console.error("Failed to update config", err);
    } finally {
        _configUpdateInFlight = false;
        if (Object.keys(_pendingConfigPatch).length > 0) {
            await _flushConfigPatch();
        }
    }
}

// ── Аксессоры конфига ─────────────────────────────────────────────

/** Возвращает объект управляющего параметра по ключу. */
function control(key) {
    return state.config?.[key];
}

/** Возвращает числовое текущее значение параметра (поле .value). */
export function controlValue(key, fallback = 0) {
    return Number(control(key)?.value ?? fallback);
}

/** Возвращает патч-объект, обновляющий поле value у параметра. */
export function patchControl(key, value) {
    return { [key]: { ...control(key), value } };
}

// ═══════════════════════════════════════════════════════════════════
// 2. RANGE-UTILS — диапазоны из конфига
// ═══════════════════════════════════════════════════════════════════

/**
 * Достаёт диапазон параметра из конфига.
 * Логирует ошибку, если параметр отсутствует или неполный.
 * @returns {{ min, max, step, initial }|null}
 */
export function getRange(key) {
    const range = control(key);

    if (!range) {
        console.error(`Missing control from backend: ${key}`);
        return null;
    }
    if (range.min == null || range.max == null || range.step == null || range.initial == null) {
        console.error(`Incomplete control from backend: ${key}`, range);
        return null;
    }

    return {
        min:     Number(range.min),
        max:     Number(range.max),
        step:    Number(range.step),
        initial: Number(range.initial),
    };
}

/** Зажимает значение в пределах диапазона. */
export function clampByRange(value, range) {
    if (!range) return Number(value);
    return Math.max(range.min, Math.min(range.max, value));
}

/**
 * Применяет диапазон из конфига к паре slider+input.
 * @returns {object|null} диапазон или null при ошибке
 */
function applyControlRange(slider, input, key) {
    const range = getRange(key);
    if (!range) return null;

    applyInputBounds(slider, range);
    applyInputBounds(input,  range);

    return range;
}

/**
 * Применяет «левоплотный» диапазон: слайдер работает в 0–100,
 * а числовой input отображает реальные значения.
 * @returns {object|null} диапазон или null при ошибке
 */
function applyLeftDenseRange(slider, input, rangeKey) {
    const range = getRange(rangeKey);
    if (!range) return null;

    if (slider) {
        slider.min  = "0";
        slider.max  = "100";
        slider.step = "1";
    }
    if (input) {
        applyInputBounds(input, { min: range.min, max: range.max, step: range.step ?? 1 });
    }

    return range;
}

// ── Tick-разметка дискретных слайдеров ───────────────────────────

/** Рендерит цифровые метки под дискретным слайдером (1, 2, 3 …). */
function renderDiscreteTicks(container, range) {
    if (!container || !range) return;

    container.innerHTML = "";
    const min = Math.round(range.min);
    const max = Math.round(range.max);

    for (let value = min; value <= max; value++) {
        const tick = document.createElement("span");
        tick.textContent = String(value);
        container.appendChild(tick);
    }
}

/** Рендерит угловые метки (0°, 45°, 90° …) под angle-слайдером. */
function renderAngleTicks(container, range) {
    if (!container || !range) return;

    container.innerHTML = "";
    const min  = Math.round(range.min);
    const max  = Math.round(range.max);
    const step = Math.max(1, Math.round(range.step));

    for (let value = min; value <= max; value += step) {
        const tick = document.createElement("span");
        tick.textContent = `${value}°`;
        container.appendChild(tick);
    }
}

// ═══════════════════════════════════════════════════════════════════
// 3. SLIDER UI — синхронизация DOM с числовыми значениями
// ═══════════════════════════════════════════════════════════════════

/**
 * Устанавливает значение слайдеру и числовому полю/спану.
 * Поддерживает как <input>, так и обычные элементы (textContent).
 */
export function setSliderAndInput(slider, input, value) {
    if (slider) slider.value = String(value);
    if (input) {
        if (input.tagName === "INPUT") input.value       = String(value);
        else                           input.textContent = String(value);
    }
}

/** Устанавливает значение дискретного слайдера и обновляет label. */
export function setDiscreteSlider(slider, value) {
    const normalized = Math.round(Number(value ?? 0));
    if (slider) slider.value = String(normalized);

    const label = document.getElementById("lightSourceCountLabel");
    if (label) label.textContent = String(normalized);
}

/** Устанавливает значение угловому слайдеру и обновляет label. */
export function setAngleSlider(slider, value) {
    const angle = Number(value ?? 0);
    if (slider) slider.value = String(angle);

    if (dom.lightSourceStartAngleLabel) {
        dom.lightSourceStartAngleLabel.textContent = `${angle}°`;
    }
}

// ═══════════════════════════════════════════════════════════════════
// 4. CURVE MATH — нелинейные преобразования слайдера орбиты
// ═══════════════════════════════════════════════════════════════════

const ORBIT_SPEED_EXPONENT = 2.0;

/**
 * Применяет степенную кривую к знаковому проценту (−100…+100).
 * Делает слайдер орбиты более чувствительным у нуля.
 */
function curveOrbitSpeed(rawValue) {
    const raw   = Math.max(-100, Math.min(100, Math.round(Number(rawValue) || 0)));
    const sign  = Math.sign(raw);
    const t     = Math.abs(raw) / 100;
    return Math.round(sign * Math.pow(t, ORBIT_SPEED_EXPONENT) * 100);
}

/**
 * Обратное преобразование для curveOrbitSpeed.
 * Используется при ручном вводе числа.
 */
function inverseCurveOrbitSpeed(value) {
    const v    = Math.max(-100, Math.min(100, Math.round(Number(value) || 0)));
    const sign = Math.sign(v);
    const t    = Math.abs(v) / 100;
    return Math.round(sign * Math.pow(t, 1 / ORBIT_SPEED_EXPONENT) * 100);
}

/**
 * «Левоплотная» кривая (t²): значения сгущены у минимума диапазона.
 * Удобна для параметров вроде периода цикла (1 сек…300 сек).
 * @param {number} rawValue — позиция слайдера 0–100
 * @param {{ min, max }} range
 */
function curveLeftDense(rawValue, range) {
    if (!range) return 0;
    const t = Math.max(0, Math.min(100, Math.round(Number(rawValue) || 0))) / 100;
    return Math.round(range.min + t * t * (range.max - range.min));
}

/**
 * Обратное преобразование для curveLeftDense.
 * @param {number} value — реальное значение параметра
 * @param {{ min, max }} range
 */
export function inverseCurveLeftDense(value, range) {
    if (!range) return 0;
    const v    = Math.max(range.min, Math.min(range.max, Number(value) || range.min));
    const span = Math.max(1, range.max - range.min);
    return Math.round(Math.sqrt((v - range.min) / span) * 100);
}

// ═══════════════════════════════════════════════════════════════════
// 5. INPUT BINDERS — привязка слайдеров к конфигу
// ═══════════════════════════════════════════════════════════════════

/**
 * Привязывает пару range+input к параметру конфига в процентах (0–100).
 * Автоматически зажимает в диапазоне rangeKey.
 */
export function bindPercentControl(rangeInput, numberInput, key, rangeKey = key) {
    const apply = immediate => {
        if (!state.config) return;

        const raw     = numberInput?.tagName === "INPUT"
            ? Number(numberInput.value)
            : Number(rangeInput?.value);
        const percent = Math.round(clampByRange(raw, getRange(rangeKey)));
        const patch   = { ...patchControl(key, percent) };

        // Глобальный свет не может быть ниже минимума цикла
        if (key === "globalLightPercent") {
            const currentMin = Math.round(controlValue("globalLightCycleMinPercent", 0));
            if (percent < currentMin) {
                Object.assign(patch, patchControl("globalLightCycleMinPercent", percent));
                setSliderAndInput(dom.globalLightCycleMinSlider, dom.globalLightCycleMinValue, percent);
            }
        }

        setSliderAndInput(rangeInput, numberInput, percent);
        scheduleConfigPatch(patch, immediate);
    };

    bindInputs(rangeInput, numberInput, () => apply(false), () => apply(true));
}

/**
 * Привязывает пару range+input к параметру конфига с произвольной нормализацией.
 * @param {Function} [normalize] — (rawValue) => normalizedValue
 */
export function bindLiveControl(rangeInput, numberInput, key, normalize = v => v) {
    const apply = immediate => {
        if (!state.config) return;

        const raw   = numberInput?.tagName === "INPUT"
            ? Number(numberInput.value)
            : Number(rangeInput?.value);
        const value = normalize(raw);

        if (rangeInput) rangeInput.value = String(value);
        if (numberInput) {
            if (numberInput.tagName === "INPUT") numberInput.value       = String(value);
            else                                 numberInput.textContent = String(value);
        }

        scheduleConfigPatch(patchControl(key, value), immediate);
    };

    bindInputs(rangeInput, numberInput, () => apply(false), () => apply(true));
}

/**
 * Привязывает дискретный слайдер (только range, без числового input).
 */
export function bindDiscreteControl(slider, key, rangeKey) {
    if (!slider) return;

    const apply = immediate => {
        if (!state.config) return;

        const range = getRange(rangeKey);
        const value = Math.round(clampByRange(Number(slider.value), range));

        setDiscreteSlider(slider, value);
        scheduleConfigPatch(patchControl(key, value), immediate);
    };

    slider.addEventListener("input",    () => apply(false));
    slider.addEventListener("change",   () => apply(true));
    slider.addEventListener("pointerup", () => apply(true));
}

/**
 * Привязывает угловой слайдер (шаг кратен rangeKey.step).
 */
export function bindAngleControl(slider, key, rangeKey) {
    if (!slider) return;

    const apply = immediate => {
        if (!state.config) return;

        const range = getRange(rangeKey);
        const step  = Math.max(1, Math.round(range.step));
        const raw   = Math.round(clampByRange(Number(slider.value), range));
        const value = Math.round(raw / step) * step;

        setAngleSlider(slider, value);
        scheduleConfigPatch(patchControl(key, value), immediate);
    };

    slider.addEventListener("input",    () => apply(false));
    slider.addEventListener("change",   () => apply(true));
    slider.addEventListener("pointerup", () => apply(true));
}

/**
 * Привязывает слайдер скорости орбиты (степенная кривая + знак).
 */
export function bindOrbitSpeedControl() {
    const slider = dom.lightSourceOrbitSpeedSlider;
    const input  = dom.lightSourceOrbitSpeedValue;
    if (!slider || !input) return;

    slider.addEventListener("input", () => {
        const curved = curveOrbitSpeed(slider.value);
        input.value  = String(curved);
        _sendOrbitSpeed(curved, false);
    });

    slider.addEventListener("change", () => {
        const curved = curveOrbitSpeed(slider.value);
        input.value  = String(curved);
        _sendOrbitSpeed(curved, true);
    });

    slider.addEventListener("pointerup", () => {
        const curved = curveOrbitSpeed(slider.value);
        input.value  = String(curved);
        _sendOrbitSpeed(curved, true);
    });

    input.addEventListener("change", () => {
        const curved = Math.max(-100, Math.min(100, Math.round(Number(input.value) || 0)));
        input.value  = String(curved);
        slider.value = String(inverseCurveOrbitSpeed(curved));
        _sendOrbitSpeed(curved, true);
    });
}

function _sendOrbitSpeed(value, immediate) {
    if (!state.config) return;
    scheduleConfigPatch(patchControl("lightSourceOrbitSpeed", value), immediate);
}

/**
 * Привязывает слайдер с левоплотной кривой (например, период цикла освещения).
 */
export function bindLeftDenseControl(slider, input, key, rangeKey) {
    if (!slider || !input) return;

    const apply = immediate => {
        if (!state.config) return;

        const range = getRange(rangeKey);
        if (!range) return;

        const rawValue    = input === document.activeElement
            ? Number(input.value)
            : curveLeftDense(slider.value, range);
        const curvedValue = Math.round(clampByRange(rawValue, range));

        input.value  = String(curvedValue);
        slider.value = String(inverseCurveLeftDense(curvedValue, range));

        scheduleConfigPatch(patchControl(key, curvedValue), immediate);
    };

    slider.addEventListener("input",    () => apply(false));
    slider.addEventListener("change",   () => apply(true));
    slider.addEventListener("pointerup", () => apply(true));
    input.addEventListener("change",    () => apply(true));
}

/**
 * Привязывает слайдер минимального уровня цикла освещения.
 * Следит за тем, чтобы min ≤ globalLightPercent.
 */
export function bindCycleMinLightControl(rangeInput, numberInput) {
    const apply = immediate => {
        if (!state.config) return;

        const raw        = numberInput?.tagName === "INPUT"
            ? Number(numberInput.value)
            : Number(rangeInput?.value);
        const minPercent = Math.round(clampByRange(raw, getRange("globalLightCycleMinPercent")));
        const globalPct  = Math.round(controlValue("globalLightPercent", 100));
        const patch      = { ...patchControl("globalLightCycleMinPercent", minPercent) };

        if (minPercent > globalPct) {
            Object.assign(patch, patchControl("globalLightPercent", minPercent));
            setSliderAndInput(dom.globalLightSlider, dom.globalLightValue, minPercent);
        }

        setSliderAndInput(rangeInput, numberInput, minPercent);
        scheduleConfigPatch(patch, immediate);
    };

    bindInputs(rangeInput, numberInput, () => apply(false), () => apply(true));
}

// ── Применение диапазонов ко всем элементам настроек ─────────────

/**
 * Устанавливает min/max/step на все слайдеры панели настроек
 * согласно диапазонам из текущего конфига.
 */
export function applyAllControlRanges() {
    applyControlRange(dom.initialCellCountSlider, dom.initialCellCountValue, "initialCellCount");
    applyControlRange(dom.foodSpawnRateSlider,    dom.foodSpawnRateValue,    "foodSpawnIntensity");
    applyControlRange(dom.viscositySlider,        dom.viscosityValue,        "viscositySlider");
    applyControlRange(dom.turbiditySlider,        dom.turbidityValue,        "turbiditySlider");
    applyControlRange(dom.gravitySlider,          dom.gravityValue,          "gravitySlider");
    applyControlRange(dom.radiationSlider,        dom.radiationValue,        "radiationSlider");
    applyControlRange(dom.globalLightSlider,      dom.globalLightValue,      "globalLightPercent");
    applyControlRange(dom.globalLightCycleMinSlider, dom.globalLightCycleMinValue, "globalLightCycleMinPercent");
    applyLeftDenseRange(dom.globalLightCyclePeriodSlider, dom.globalLightCyclePeriodValue, "globalLightCyclePeriodSeconds");
    applyControlRange(dom.lightSourceCountSlider,       null,                     "lightSourceCount");
    applyControlRange(dom.lightSourceStartAngleSlider,  null,                     "lightSourceStartAngle");
    applyControlRange(dom.lightSourceBrightnessSlider,  dom.lightSourceBrightnessValue,  "lightSourceBrightness");
    applyControlRange(dom.lightSourceOrbitRadiusSlider, dom.lightSourceOrbitRadiusValue, "lightSourceOrbitRadius");
    applyControlRange(dom.lightSourceOrbitSpeedSlider,  dom.lightSourceOrbitSpeedValue,  "lightSourceOrbitSpeed");

    renderDiscreteTicks(dom.lightSourceCountTicks,     getRange("lightSourceCount"));
    renderAngleTicks   (dom.lightSourceStartAngleTicks, getRange("lightSourceStartAngle"));
}
