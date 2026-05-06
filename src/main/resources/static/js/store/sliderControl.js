import { state, sliderState } from "./state.js";
import { updateConfig } from "../transport/api/simulationApi.js";
import { applyDisplayFromConfig, applyPauseButtonState } from "./simActions.js";
import { dom } from "../ui/dom.js";

const SNAP_ZONE_DRAG = 4;
const SNAP_ZONE_RELEASE = 8;
const SNAP_ANIMATE_MS = 220;
const SLIDER_SEND_INTERVAL_MS = 50;

let _snapAnimationId = null;
let _timeSendTimer = null;
let _timeSendInFlight = false;
let _queuedTimeSlider = null;
let _queuedTimeClearPending = false;

export function startSliderDrag() {
    sliderState.isDragging = true;
    _cancelSnapAnimation();
}

export function updateTimeLocal(rawValue) {
    const value = Number(rawValue);
    const snapped = _snapDuringDrag(value);

    if (snapped !== value) {
        dom.timeSlider.value = String(snapped);
    }

    state.pendingTimeSlider = snapped;
    _queueTimeSend(snapped, false);
}

export function endSliderDrag(rawValue) {
    _cancelQueuedTimeSend();
    sliderState.isDragging = false;

    const value = Number(dom.timeSlider.value);

    if (Math.abs(value - 50) <= SNAP_ZONE_RELEASE) {
        _animateSnapToCenter(value);
    } else {
        state.pendingTimeSlider = value;
        _queueTimeSend(value, true);
    }
}

function _snapDuringDrag(value) {
    return Math.abs(value - 50) <= SNAP_ZONE_DRAG ? 50 : value;
}

function _animateSnapToCenter(fromValue) {
    _cancelSnapAnimation();

    const startTime = performance.now();
    const startVal = fromValue;

    function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / SNAP_ANIMATE_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = startVal + (50 - startVal) * eased;

        dom.timeSlider.value = String(current);
        state.pendingTimeSlider = current;

        if (t < 1) {
            _snapAnimationId = requestAnimationFrame(step);
        } else {
            dom.timeSlider.value = "50";
            state.pendingTimeSlider = 50;
            _queueTimeSend(50, true);
        }
    }

    _snapAnimationId = requestAnimationFrame(step);
}

function _cancelSnapAnimation() {
    if (_snapAnimationId !== null) {
        cancelAnimationFrame(_snapAnimationId);
        _snapAnimationId = null;
    }
}

function _cancelQueuedTimeSend() {
    if (_timeSendTimer !== null) {
        clearTimeout(_timeSendTimer);
        _timeSendTimer = null;
    }
}

function _queueTimeSend(value, clearPending) {
    _queuedTimeSlider = value;
    _queuedTimeClearPending ||= clearPending;

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

async function _flushQueuedTimeSend() {
    if (_queuedTimeSlider === null || _timeSendInFlight) return;

    const value = _queuedTimeSlider;
    const clearPending = _queuedTimeClearPending;
    _queuedTimeSlider = null;
    _queuedTimeClearPending = false;
    _timeSendInFlight = true;

    try {
        state.config = await updateConfig({
            ...state.config,
            timeSlider: value,
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