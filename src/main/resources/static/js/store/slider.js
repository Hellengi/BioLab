/**
 * store/slider.js
 * Управляет слайдером времени/температуры: snap во время перетаскивания,
 * debounced отправка на сервер.
 */

import { state, sliderState } from "./state.js";
import { updateConfig } from "../transport/api/simulation.js";
import { applyDisplayFromConfig, applyPauseButtonState } from "../ui/toolbar.js";
import { dom } from "../ui/dom.js";

const SNAP_TARGETS = [25, 50, 75]; // 0.1×, 1×, 10×

const SNAP_ZONE_DRAG = 3.0;          // половина зоны snap вокруг отметки, в единицах шкалы 0..100
const SLIDER_SEND_INTERVAL_MS = 50;  // минимальный интервал между отправками на сервер

let _timeSendTimer = null;
let _timeSendInFlight = false;
let _queuedTimeSlider = null;
let _queuedClearPending = false;

// ── Публичные обработчики событий ───────────────────────────────────────────

export function startSliderDrag() {
    sliderState.isDragging = true;
}

export function updateTimeLocal(rawValue) {
    const value = Number(rawValue);
    const snapped = _snapDuringDrag(value);

    if (snapped !== value) {
        dom.timeSlider.value = String(snapped);
    }

    state.pendingTimeSlider = snapped;
    applyDisplayFromConfig(state.config?.temperatureCelsius ?? null, state.config?.speedFactor ?? null);
    _enqueueTimeSend(snapped, false);
}

export function endSliderDrag() {
    _cancelQueuedTimeSend();
    sliderState.isDragging = false;

    const value = Number(dom.timeSlider.value);
    state.pendingTimeSlider = value;
    applyDisplayFromConfig(state.config?.temperatureCelsius ?? null, state.config?.speedFactor ?? null);
    _enqueueTimeSend(value, true);
}

/** Сбрасывает слайдер в нейтральное положение (центр = 20°C, скорость 1×). */
export function resetTimeToNormal() {
    _cancelQueuedTimeSend();

    sliderState.isDragging = false;
    dom.timeSlider.value = "50";
    state.pendingTimeSlider = 50;
    applyDisplayFromConfig(state.config?.temperatureCelsius ?? null, 1.0);

    _enqueueTimeSend(50, true);
}

// ── Snap только во время движения ───────────────────────────────────────────

function _snapDuringDrag(value) {
    if (!Number.isFinite(value)) return 50;
    if (!sliderState.isDragging) return _roundSliderValue(value);

    const target = _nearestSnapTarget(value, SNAP_ZONE_DRAG);
    return target === null ? _roundSliderValue(value) : target;
}

function _nearestSnapTarget(value, zone) {
    let nearestTarget = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const target of SNAP_TARGETS) {
        const distance = Math.abs(value - target);
        if (distance <= zone && distance < nearestDistance) {
            nearestTarget = target;
            nearestDistance = distance;
        }
    }

    return nearestTarget;
}

function _roundSliderValue(value) {
    return Math.round(value * 10) / 10;
}

// ── Дросселированная отправка на сервер ─────────────────────────────────────

function _enqueueTimeSend(value, clearPending) {
    _queuedTimeSlider = value;
    _queuedClearPending ||= clearPending;

    if (_timeSendInFlight || _timeSendTimer !== null) return;

    _flushQueuedTimeSend();
}

function _scheduleNextTimeSend() {
    if (_timeSendTimer !== null) return;

    _timeSendTimer = setTimeout(() => {
        _timeSendTimer = null;
        _flushQueuedTimeSend();
    }, SLIDER_SEND_INTERVAL_MS);
}

function _cancelQueuedTimeSend() {
    if (_timeSendTimer !== null) {
        clearTimeout(_timeSendTimer);
        _timeSendTimer = null;
    }
}

async function _flushQueuedTimeSend() {
    if (_queuedTimeSlider === null || _timeSendInFlight) return;

    const value = _queuedTimeSlider;
    const clearPending = _queuedClearPending;
    _queuedTimeSlider = null;
    _queuedClearPending = false;
    _timeSendInFlight = true;

    try {
        state.config = await updateConfig({
            ...state.config,
            timeSlider: { ...state.config.timeSlider, value },
        });

        applyDisplayFromConfig(state.config.temperatureCelsius, state.config.speedFactor);
        applyPauseButtonState(state.config.paused);

        if (clearPending) {
            state.pendingTimeSlider = null;
        }
    } catch (err) {
        console.error("Failed to send time slider", err);
    } finally {
        _timeSendInFlight = false;
        if (_queuedTimeSlider !== null) {
            _scheduleNextTimeSend();
        }
    }
}


