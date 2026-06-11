const FLUSH_INTERVAL_MS = 1000;
const MAX_SAMPLES = 240;

let sender = null;
let lastFlushMs = performance.now();
let fps = 0;
let droppedFrames = 0;
let inboundPayloadBytes = 0;
const decodeSamples = [];
const drawSamples = [];

export function configureClientMetricsSender(sendFn) {
    sender = typeof sendFn === "function" ? sendFn : null;
    lastFlushMs = performance.now();
}

export function recordClientFps(value) {
    const number = Number(value);
    if (Number.isFinite(number)) {
        fps = number;
    }
    flushClientMetricsIfDue();
}

export function recordClientDecodeTime(durationMs, bytes = 0) {
    pushSample(decodeSamples, durationMs);
    const safeBytes = Number(bytes);
    if (Number.isFinite(safeBytes) && safeBytes > 0) {
        inboundPayloadBytes += safeBytes;
    }
    flushClientMetricsIfDue();
}

export function recordClientDrawTime(durationMs) {
    pushSample(drawSamples, durationMs);
    flushClientMetricsIfDue();
}

export function recordClientDroppedFrame(count = 1) {
    const number = Number(count);
    if (Number.isFinite(number) && number > 0) {
        droppedFrames += number;
    }
    flushClientMetricsIfDue();
}

export function flushClientMetricsIfDue(force = false) {
    if (!sender) return;

    const now = performance.now();
    if (!force && now - lastFlushMs < FLUSH_INTERVAL_MS) {
        return;
    }

    const payload = {
        type: "clientMetrics",
        timestamp: Date.now(),
        fps,
        decodeTimeMs: summarize(decodeSamples),
        drawTimeMs: summarize(drawSamples),
        inboundPayloadBytes,
        droppedFrames,
    };

    decodeSamples.length = 0;
    drawSamples.length = 0;
    inboundPayloadBytes = 0;
    droppedFrames = 0;
    lastFlushMs = now;

    try {
        sender(payload);
    } catch (error) {
        // Client telemetry is diagnostic-only and must never break rendering.
    }
}

function pushSample(samples, value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
        return;
    }
    samples.push(number);
    if (samples.length > MAX_SAMPLES) {
        samples.splice(0, samples.length - MAX_SAMPLES);
    }
}

function summarize(samples) {
    if (!samples.length) {
        return { count: 0, avg: 0, min: 0, max: 0 };
    }

    let total = 0;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const value of samples) {
        total += value;
        min = Math.min(min, value);
        max = Math.max(max, value);
    }

    return {
        count: samples.length,
        avg: total / samples.length,
        min,
        max,
    };
}
