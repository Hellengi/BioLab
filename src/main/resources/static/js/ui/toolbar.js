import { dom } from "./dom.js";
import { attachTooltip } from "./tooltip.js";
import { t } from "../localization/localization.js";

const TIME_COLOR_COLD   = "#60a5fa";
const TIME_COLOR_NORMAL = "#f1f5f9";
const TIME_COLOR_HOT    = "#f59e6b";
const MAX_CLOCK_COLOR_MIX = 0.56;
const NEUTRAL_SLIDER_VALUE = 50;

const MILLISECONDS_PER_SECOND = 1000;
const MINUTE_SECONDS = 60;
const HOUR_SECONDS   = 60 * MINUTE_SECONDS;
const DAY_SECONDS    = 24 * HOUR_SECONDS;
const YEAR_SECONDS   = 365.25 * DAY_SECONDS;

// ── Public API ──────────────────────────────────────────────────────────────

export function bindToolbarTooltips() {
    attachTooltip(dom.timeDisplay, dom.timeTooltip, { maxWidth: 148, fixedWidth: 148 });
}

/**
 * Applies toolbar display state. tempCelsius is intentionally ignored: the old
 * temperature indicator was merged into the time display.
 * @param {number|null} tempCelsius
 * @param {number|null} speedFactor
 */
export function applyDisplayFromConfig(tempCelsius, speedFactor) {
    const sliderValue = _currentTimeSliderValue();
    _updateSpeedLabel(speedFactor ?? _speedFromSlider(sliderValue));
    _applyTimeSpeedTint(sliderValue);
}

export function applyPauseButtonState(paused) {
    if (!dom.pauseBtn) return;
    dom.pauseBtn.textContent = paused ? t("Resume") : t("Pause");
    dom.pauseBtn.classList.toggle("paused", paused);
}

export function updateTimeDisplay(seconds, tick) {
    if (!dom.timeDisplay || !dom.timeYearsDays || !dom.timeClock) return;

    const safeSeconds = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
    const safeTick = Number.isFinite(Number(tick)) ? Number(tick) : 0;
    const formatted = _formatFullSimulationTime(safeSeconds);

    dom.timeYearsDays.textContent = t("time.yearsDays", { years: formatted.years, days: formatted.days });
    dom.timeClock.textContent = `${_pad2(formatted.hours)}:${_pad2(formatted.minutes)}:${_pad2(formatted.seconds)}.${_pad3(formatted.milliseconds)}`;

    if (dom.timeTooltipTick) {
        dom.timeTooltipTick.textContent = _formatTickValue(safeTick);
    }
}

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

// ── Private helpers ─────────────────────────────────────────────────────────

function _formatTickValue(tick) {
    const safeTick = Math.max(0, Math.round(Number(tick) || 0));
    if (safeTick >= 1_000_000_000_000) return `${Math.round(safeTick / 1_000_000_000)}b`;
    if (safeTick >= 1_000_000_000) return `${Math.round(safeTick / 1_000_000)}m`;
    if (safeTick >= 1_000_000) return `${Math.round(safeTick / 1_000)}k`;
    return String(safeTick);
}

function _currentTimeSliderValue() {
    const value = Number(dom.timeSlider?.value);
    return Number.isFinite(value) ? value : NEUTRAL_SLIDER_VALUE;
}

function _speedFromSlider(sliderValue) {
    return Math.pow(10, (sliderValue - NEUTRAL_SLIDER_VALUE) / 25.0);
}

function _updateSpeedLabel(speedFactor) {
    if (!dom.speedLabel) return;
    dom.speedLabel.textContent = `${_formatSpeed(speedFactor)}×`;
}

function _applyTimeSpeedTint(sliderValue) {
    const offset = Math.max(-50, Math.min(50, sliderValue - NEUTRAL_SLIDER_VALUE));
    const power = Math.abs(offset) / 50;
    const colorMix = power * MAX_CLOCK_COLOR_MIX;
    const targetColor = offset < 0 ? TIME_COLOR_COLD : TIME_COLOR_HOT;
    if (dom.timeClock) {
        dom.timeClock.style.color = power <= 0.001
            ? TIME_COLOR_NORMAL
            : _lerpColor(TIME_COLOR_NORMAL, targetColor, colorMix);
    }

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




