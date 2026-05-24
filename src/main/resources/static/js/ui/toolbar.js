/**
 * toolbar.js
 * Управляет отображением панели инструментов: температура, скорость, пауза.
 * Содержит чисто UI-логику, которую неправильно держать в store/actions.
 */

import { dom } from "./dom.js";

// ── Цветовые константы температурного индикатора ────────────────────────────

const TEMP_COLOR_COLD   = "#60a5fa";
const TEMP_COLOR_NORMAL = "#f1f5f9";
const TEMP_COLOR_HOT    = "#f87171";

const TEMP_COLD_THRESHOLD = 10;   // °C — ниже этого начинается холодный оттенок
const TEMP_HOT_THRESHOLD  = 35;   // °C — выше этого начинается горячий оттенок
const TEMP_COLD_RANGE     = 30;   // диапазон плавного перехода к холодному
const TEMP_HOT_RANGE      = 25;   // диапазон плавного перехода к горячему

// ── Публичные функции ────────────────────────────────────────────────────────

/**
 * Обновляет отображение температуры и скорости симуляции в тулбаре.
 * @param {number|null} tempCelsius
 * @param {number|null} speedFactor
 */
export function applyDisplayFromConfig(tempCelsius, speedFactor) {
    _updateTemperatureLabel(tempCelsius ?? 20);
    _updateSpeedLabel(speedFactor ?? 0);
}

/**
 * Устанавливает состояние кнопки паузы (текст + CSS-класс).
 * @param {boolean} paused
 */
export function applyPauseButtonState(paused) {
    if (!dom.pauseBtn) return;
    dom.pauseBtn.textContent = paused ? "Resume" : "Pause";
    dom.pauseBtn.classList.toggle("paused", paused);
}

// ── Приватные вспомогательные функции ───────────────────────────────────────

function _updateTemperatureLabel(t) {
    if (!dom.temperatureLabel) return;

    dom.temperatureLabel.textContent = `${Math.round(t)}°C`;
    dom.temperatureLabel.style.color = _temperatureColor(t);
}

function _updateSpeedLabel(speedFactor) {
    if (!dom.speedLabel) return;
    dom.speedLabel.textContent = `${speedFactor.toFixed(2)}×`;
}

function _temperatureColor(t) {
    if (t < TEMP_COLD_THRESHOLD) {
        const factor = Math.max(0, Math.min(1, (TEMP_COLD_THRESHOLD - t) / TEMP_COLD_RANGE));
        return _lerpColor(TEMP_COLOR_NORMAL, TEMP_COLOR_COLD, factor);
    }
    if (t > TEMP_HOT_THRESHOLD) {
        const factor = Math.max(0, Math.min(1, (t - TEMP_HOT_THRESHOLD) / TEMP_HOT_RANGE));
        return _lerpColor(TEMP_COLOR_NORMAL, TEMP_COLOR_HOT, factor);
    }
    return TEMP_COLOR_NORMAL;
}

function _lerpColor(from, to, t) {
    const f = _hexToRgb(from);
    const s = _hexToRgb(to);
    return `rgb(${Math.round(f.r + (s.r - f.r) * t)},${Math.round(f.g + (s.g - f.g) * t)},${Math.round(f.b + (s.b - f.b) * t)})`;
}

function _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 0, g: 0, b: 0 };
}