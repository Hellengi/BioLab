/**
 * toolbar.js
 * Управляет отображением верхней панели: температура, скорость, пауза,
 * время симуляции и FPS/TPS.
 */

import { dom } from "./dom.js";
import { attachTooltip } from "./tooltip.js";

// ── Цветовые константы температурного индикатора ────────────────────────────

const TEMP_COLOR_COLD   = "#60a5fa";
const TEMP_COLOR_NORMAL = "#f1f5f9";
const TEMP_COLOR_HOT    = "#f87171";

const TEMP_COLD_THRESHOLD = 10;   // °C — ниже этого начинается холодный оттенок
const TEMP_HOT_THRESHOLD  = 35;   // °C — выше этого начинается горячему оттенку
const TEMP_COLD_RANGE     = 30;   // диапазон плавного перехода к холодному
const TEMP_HOT_RANGE      = 25;   // диапазон плавного перехода к горячему

const MILLISECONDS_PER_SECOND = 1000;
const MINUTE_SECONDS = 60;
const HOUR_SECONDS   = 60 * MINUTE_SECONDS;
const DAY_SECONDS    = 24 * HOUR_SECONDS;
const YEAR_SECONDS   = 365.25 * DAY_SECONDS;

// ── Публичные функции ────────────────────────────────────────────────────────

/** Подключает tooltip верхней панели после bindDom(). */
export function bindToolbarTooltips() {
    attachTooltip(dom.timeDisplay, dom.timeTooltip, { maxWidth: 220 });
}

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

/**
 * Обновляет окно времени и кастомный tooltip с tick.
 * @param {number|null} seconds
 * @param {number|null} tick
 */
export function updateTimeDisplay(seconds, tick) {
    if (!dom.timeDisplay || !dom.timeYearsDays || !dom.timeClock) return;

    const safeSeconds = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
    const safeTick = Number.isFinite(Number(tick)) ? Number(tick) : 0;
    const formatted = _formatFullSimulationTime(safeSeconds);

    dom.timeYearsDays.textContent = `${formatted.years}y · ${formatted.days}d`;
    dom.timeClock.textContent = `${_pad2(formatted.hours)}:${_pad2(formatted.minutes)}:${_pad2(formatted.seconds)}.${_pad3(formatted.milliseconds)}`;

    if (dom.timeTooltipTick) {
        dom.timeTooltipTick.textContent = String(Math.round(safeTick));
    }
}

/**
 * Обновляет правый индикатор FPS/TPS.
 * В паузе вместо значений показывает Paused.
 * @param {number|null} fps
 * @param {number|null} tps
 * @param {boolean} paused
 */
export function updateMetricsDisplay(fps, tps, paused = false) {
    const safeFps = Math.max(0, Math.round(Number(fps) || 0));
    const safeTps = Math.max(0, Math.round(Number(tps) || 0));

    if (dom.fpsLabel) {
        dom.fpsLabel.classList.toggle("is-paused", Boolean(paused));
    }

    if (dom.fpsValue) {
        dom.fpsValue.textContent = String(safeFps);
    }

    if (dom.tpsValue) {
        dom.tpsValue.textContent = String(safeTps);
    }
}

// ── Приватные вспомогательные функции ───────────────────────────────────────

function _updateTemperatureLabel(t) {
    if (!dom.temperatureLabel) return;

    dom.temperatureLabel.textContent = `${Math.round(t)}°C`;
    dom.temperatureLabel.style.color = _temperatureColor(t);
}

function _updateSpeedLabel(speedFactor) {
    if (!dom.speedLabel) return;
    dom.speedLabel.textContent = `${_formatSpeed(speedFactor)}×`;
}

function _formatSpeed(speedFactor) {
    const speed = Number(speedFactor) || 0;

    if (speed >= 100 || speed === 0) return speed.toFixed(0);
    if (speed >= 10) return speed.toFixed(1);
    if (speed >= 1) return speed.toFixed(2);
    return speed.toFixed(2);
}

function _formatFullSimulationTime(seconds) {
    const safeMilliseconds = Math.max(0, Math.floor(Math.abs(seconds) * MILLISECONDS_PER_SECOND));
    const wholeSeconds = Math.floor(safeMilliseconds / MILLISECONDS_PER_SECOND);

    const years = Math.floor(wholeSeconds / YEAR_SECONDS);
    let restSeconds = wholeSeconds - Math.floor(years * YEAR_SECONDS);

    const days = Math.floor(restSeconds / DAY_SECONDS);
    restSeconds -= days * DAY_SECONDS;

    const hours = Math.floor(restSeconds / HOUR_SECONDS);
    restSeconds -= hours * HOUR_SECONDS;

    const minutes = Math.floor(restSeconds / MINUTE_SECONDS);
    restSeconds -= minutes * MINUTE_SECONDS;

    return {
        years,
        days,
        hours,
        minutes,
        seconds: restSeconds,
        milliseconds: safeMilliseconds % MILLISECONDS_PER_SECOND,
    };
}

function _pad2(value) {
    return String(Math.max(0, Math.floor(value))).padStart(2, "0");
}

function _pad3(value) {
    return String(Math.max(0, Math.floor(value))).padStart(3, "0");
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
