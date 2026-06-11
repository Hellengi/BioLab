import { decodeBinaryRenderFrame } from "../transport/ws/binary-render-frame.js";
import { BASELINE_SCENARIOS, cloneScenario } from "./baseline-scenarios.js";

export const DEFAULT_WARMUP_MS = 1000;
export const DEFAULT_RUN_MS = 5000;
export const DEFAULT_WS_CLIENTS = 1;

const REQUEST_TIMEOUT_MS = 12000;
const METRICS_TIMEOUT_MS = 8000;
const SYNTHETIC_CLIENT_TIMEOUT_MS = 5000;
const SETUP_TIMEOUT_BASE_MS = 20000;
const SETUP_TIMEOUT_PER_ENTITY_MS = 5;
const WATCHDOG_FAIL_MS = 1500;
const RECOVERY_TIMEOUT_MS = 30000;
const RECOVERY_STABLE_FRAMES = 3;

export async function runBaselineSuite(options = {}) {
    const scenarioIds = Array.isArray(options.scenarioIds) ? options.scenarioIds : null;
    const scenarios = scenarioIds
        ? BASELINE_SCENARIOS.filter(scenario => scenarioIds.includes(scenario.id))
        : BASELINE_SCENARIOS;

    const warmupMs = sanitizeDuration(options.warmupMs, DEFAULT_WARMUP_MS, 0);
    const runMs = sanitizeDuration(options.runMs, DEFAULT_RUN_MS, 1000);
    const wsClients = sanitizeWsClientCount(options.wsClients ?? options.syntheticClients, DEFAULT_WS_CLIENTS);
    const syntheticClients = Math.max(0, wsClients - 1);
    const callbacks = options.callbacks ?? {};
    const signal = options.signal ?? null;
    const results = [];

    throwIfAborted(signal);
    callbacks.onSuiteStart?.({ total: scenarios.length, warmupMs, runMs });

    let index = 0;
    for (const baseScenario of scenarios) {
        throwIfAborted(signal);
        index++;
        const scenario = cloneScenario(baseScenario, {
            syntheticClients,
        });
        const progress = { index, total: scenarios.length };

        try {
            const result = await runBaselineScenario(scenario, {
                warmupMs,
                runMs,
                callbacks,
                signal,
                suiteProgress: progress,
            });
            results.push(result);
        } catch (error) {
            if (signal?.aborted || error?.name === "AbortError") {
                throw error;
            }
            const failed = createScenarioFailureResult(scenario, error, progress);
            results.push(failed);
            callbacks.onScenarioSkipped?.(failed, progress);
        }

        // Important for heavy runs: do not start the next scenario while the
        // previous world/render path is still recovering. This prevents a stalled
        // 5000/5000 scenario from making the following debug/light scenarios look
        // failed even though they did not actually run under clean conditions.
        if (index < scenarios.length) {
            const recovery = await recoverBetweenSuiteScenarios(callbacks, signal, progress);
            if (recovery?.mainThreadOverrunMs > WATCHDOG_FAIL_MS) {
                markLastResultFailedByRecovery(results, recovery);
            }
        }
    }

    const suite = createBenchmarkReport(results, {
        mode: "suite",
        warmupMs,
        runMs,
        wsClients,
        syntheticClients,
    });
    callbacks.onSuiteComplete?.(suite);
    return suite;
}

export async function runBaselineScenario(scenario, options = {}) {
    const warmupMs = sanitizeDuration(options.warmupMs, DEFAULT_WARMUP_MS, 0);
    const runMs = sanitizeDuration(options.runMs, DEFAULT_RUN_MS, 1000);
    const callbacks = options.callbacks ?? {};
    const signal = options.signal ?? null;
    const syntheticClientCount = sanitizeClientCount(scenario.syntheticClients, 0);
    const suiteProgress = options.suiteProgress ?? null;
    const scenarioStartedAt = performance.now();
    const lagMonitor = startMainThreadLagMonitor();
    let clients = [];

    throwIfAborted(signal);
    callbacks.onScenarioStart?.(scenario, suiteProgress);

    try {
        callbacks.onDisplayLayers?.(scenario.layers ?? {});
        await resetSimulationForBenchmarkWithWatchdog({
            name: scenario.name,
            cells: scenario.cells,
            food: scenario.food,
            running: true,
            displayLayers: scenario.layers ?? {},
            ...(scenario.lighting ?? {}),
        }, scenario, signal);

        throwIfAborted(signal);
        callbacks.onAfterScenarioReset?.(scenario);
        await delay(250, signal);
        clients = await openSyntheticClients(syntheticClientCount, scenario.layers ?? {}, signal);
        callbacks.onSyntheticClientsReady?.(clients.length, scenario, suiteProgress);

        await resetPerformanceMetricsWithWatchdog(signal);
        if (warmupMs > 0) {
            callbacks.onWarmupStart?.(scenario, warmupMs, suiteProgress);
            await delay(warmupMs, signal);
            await resetPerformanceMetricsWithWatchdog(signal);
        }

        callbacks.onMeasureStart?.(scenario, runMs, suiteProgress);
        const measureStartedAt = performance.now();
        await delay(runMs, signal);
        const mainThreadOverrunMs = Math.max(0, performance.now() - measureStartedAt - runMs, lagMonitor.maxLag());
        const stalled = mainThreadOverrunMs > WATCHDOG_FAIL_MS;
        if (stalled) {
            callbacks.onWatchdogWarning?.({ scenario, suiteProgress, mainThreadOverrunMs });
        }

        const snapshot = await getPerformanceMetricsWithWatchdog(signal);
        const result = createScenarioResult(scenario, snapshot, {
            mainThreadOverrunMs,
            elapsedMs: performance.now() - scenarioStartedAt,
        });
        if (stalled) {
            markResultFailed(result, timeoutError(`Browser main thread stalled for ${Math.round(mainThreadOverrunMs)} ms during ${scenario.shortName ?? scenario.name ?? "benchmark"}`,
                    "MAIN_THREAD_STALL"));
        }
        callbacks.onScenarioComplete?.(result, suiteProgress);
        return result;
    } catch (error) {
        callbacks.onScenarioError?.(scenario, error, suiteProgress);
        throw error;
    } finally {
        lagMonitor.stop();
        closeClients(clients);
    }
}

export function createBenchmarkReport(results, options = {}) {
    const safeResults = Array.isArray(results) ? results : (results ? [results] : []);
    const warmupMs = sanitizeDuration(options.warmupMs, DEFAULT_WARMUP_MS, 0);
    const runMs = sanitizeDuration(options.runMs, DEFAULT_RUN_MS, 1000);
    const wsClients = sanitizeWsClientCount(options.wsClients ?? options.syntheticClients, DEFAULT_WS_CLIENTS);

    return {
        generatedAt: new Date().toISOString(),
        mode: options.mode ?? (safeResults.length === 1 ? "single" : "suite"),
        parameters: {
            warmupMs,
            runMs,
            wsClients,
            syntheticClients: Math.max(0, wsClients - 1),
            speed: "1x",
            source: "frontend",
        },
        results: safeResults,
    };
}

export function normalizeBenchmarkReport(result, options = {}) {
    if (Array.isArray(result?.results) && result?.parameters) {
        return result;
    }
    if (Array.isArray(result?.scenarios)) {
        return createBenchmarkReport(result.scenarios, {
            mode: "suite",
            warmupMs: result.warmupMs,
            runMs: result.runMs,
            wsClients: options.wsClients ?? options.syntheticClients,
        });
    }
    if (result?.scenario && result?.summary) {
        return createBenchmarkReport([result], {
            mode: "single",
            warmupMs: options.warmupMs,
            runMs: options.runMs,
            wsClients: options.wsClients ?? options.syntheticClients,
        });
    }
    return createBenchmarkReport([], options);
}

export function createScenarioResult(scenario, snapshot, runtime = {}) {
    return {
        scenario: publicScenario(scenario),
        summary: summarizeSnapshot(snapshot, runtime),
        snapshot,
    };
}

export function createScenarioFailureResult(scenario, error, progress = null) {
    return {
        scenario: publicScenario(scenario),
        summary: {
            failed: true,
            error: cleanErrorMessage(error),
            clientFps: null,
            serverTps: null,
            tickTimeMs: null,
            worldLockHoldMs: null,
            snapshotCopyMs: null,
            renderEncodeMs: null,
            renderPayloadBytes: null,
            droppedFrames: null,
            clientDecodeMs: null,
            clientDrawMs: null,
        },
        error: {
            name: String(error?.name ?? "Error"),
            message: cleanErrorMessage(error),
            code: error?.code == null ? null : String(error.code),
        },
        progress,
        snapshot: null,
    };
}

export function summarizeSnapshot(snapshot, runtime = {}) {
    const durations = snapshot?.durations ?? {};
    const bytes = snapshot?.bytes ?? {};
    const gauges = snapshot?.gauges ?? {};
    const counters = snapshot?.counters ?? {};

    return {
        tickTimeMs: metricAverage(durations["server.tick.time"]),
        worldLockWaitMs: metricAverage(durations["server.worldLock.wait"]),
        worldLockHoldMs: metricAverage(durations["server.worldLock.hold"]),
        snapshotCopyMs: metricAverage(durations["server.snapshot.copy"]),
        renderEncodeMs: metricAverage(durations["server.render.encode"]),
        websocketSendMs: metricAverage(durations["server.websocket.send"]),
        renderPayloadBytes: metricAverage(bytes["server.payload.bytes.render"]),
        totalPayloadBytes: metricAverage(bytes["server.payload.bytes"]),
        websocketSentBytes: metricAverage(bytes["server.websocket.sentBytes"]),
        clientInboundPayloadBytes: metricAverage(bytes["client.inboundPayload.bytes"]),
        pendingMessages: numberOrNull(gauges["server.websocket.pendingMessages"]),
        droppedFrames: numberOrNull(counters["server.websocket.droppedFrames"] ?? gauges["server.websocket.droppedFrames.current"]),
        skippedSends: numberOrNull(gauges["server.websocket.skippedSends.current"]),
        clientFps: numberOrNull(gauges["client.fps"]),
        serverTps: numberOrNull(gauges["server.tps"]),
        clientDecodeMs: metricAverage(durations["client.decode"]),
        clientDrawMs: metricAverage(durations["client.draw"]),
        gcAllocationRateBytesPerSec: numberOrNull(gauges["server.gc.heapAllocationRateApprox.bytesPerSec"]),
        gcCollectionsDelta: numberOrNull(gauges["server.gc.collections.delta"]),
        clientMainThreadOverrunMs: numberOrNull(runtime.mainThreadOverrunMs),
        elapsedMs: numberOrNull(runtime.elapsedMs),
    };
}

export function formatScenarioSummary(result) {
    return `FPS ${formatNumber(result?.summary?.clientFps, 1)} · TPS ${formatNumber(result?.summary?.serverTps, 0)}`;
}

export function downloadBenchmarkJson(result, filenamePrefix = "biolab-baseline") {
    const report = normalizeBenchmarkReport(result);
    if (!report.results.length) return;
    const blob = new Blob([benchmarkJsonText(report)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenamePrefix}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

export function benchmarkJsonText(result) {
    return JSON.stringify(normalizeBenchmarkReport(result), null, 2);
}

export function formatNumber(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return number.toFixed(digits);
}

export function formatBytes(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    if (Math.abs(number) >= 1024 * 1024) return `${(number / (1024 * 1024)).toFixed(2)} MiB`;
    if (Math.abs(number) >= 1024) return `${(number / 1024).toFixed(1)} KiB`;
    return `${Math.round(number)} B`;
}

export function isBenchmarkAbortError(error) {
    return error?.name === "AbortError" || error?.name === "TimeoutError" || error?.code === "BENCHMARK_ABORTED";
}

function publicScenario(scenario) {
    return {
        id: scenario.id,
        name: scenario.name,
        shortName: scenario.shortName ?? scenario.name,
        cells: scenario.cells,
        food: scenario.food,
        wsClients: sanitizeClientCount(scenario.syntheticClients, 0) + 1,
        syntheticClients: sanitizeClientCount(scenario.syntheticClients, 0),
        layers: { ...(scenario.layers ?? {}) },
        lighting: { ...(scenario.lighting ?? {}) },
    };
}

async function recoverBetweenSuiteScenarios(callbacks, signal, progress) {
    throwIfAborted(signal);
    callbacks.onRecoveryStart?.(progress);
    const lagMonitor = startMainThreadLagMonitor();
    let lastError = null;
    try {
        for (let attempt = 1; attempt <= 3; attempt++) {
            throwIfAborted(signal);
            try {
                await resetSimulationForBenchmarkRecovery(signal);
                await waitForMainThreadRecovery(signal);
                await resetPerformanceMetricsWithWatchdog(signal);
                callbacks.onRecoveryComplete?.({ ...progress, attempt });
                return { attempt, mainThreadOverrunMs: lagMonitor.maxLag() };
            } catch (error) {
                if (signal?.aborted || error?.name === "AbortError") throw error;
                lastError = error;
                callbacks.onRecoveryRetry?.({ ...progress, attempt, error });
                await delay(Math.min(3000, 500 * attempt), signal);
            }
        }
        throw lastError ?? timeoutError("Benchmark recovery failed", "RECOVERY_FAILED");
    } finally {
        lagMonitor.stop();
    }
}

function markLastResultFailedByRecovery(results, recovery) {
    const last = Array.isArray(results) ? results[results.length - 1] : null;
    if (!last || last.summary?.failed) return;
    const overrun = Math.round(Number(recovery?.mainThreadOverrunMs) || 0);
    markResultFailed(last, timeoutError(`Browser main thread stalled for ${overrun} ms during or immediately after this scenario`,
            "MAIN_THREAD_STALL"), overrun);
}

function markResultFailed(result, error, overrunOverride = null) {
    if (!result) return result;
    const message = cleanErrorMessage(error);
    const overrun = Number.isFinite(Number(overrunOverride))
            ? Number(overrunOverride)
            : Number(result.summary?.clientMainThreadOverrunMs);
    result.summary = {
        ...(result.summary ?? {}),
        failed: true,
        error: message,
        clientMainThreadOverrunMs: Number.isFinite(overrun)
                ? Math.max(Number(result.summary?.clientMainThreadOverrunMs) || 0, overrun)
                : result.summary?.clientMainThreadOverrunMs ?? null,
    };
    result.error = {
        name: String(error?.name ?? "TimeoutError"),
        message,
        code: error?.code == null ? "MAIN_THREAD_STALL" : String(error.code),
    };
    return result;
}

function resetSimulationForBenchmarkRecovery(signal) {
    return requestJson("/api/simulation/benchmark/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "benchmark recovery",
            cells: 0,
            food: 0,
            running: false,
            displayLayers: null,
        }),
    }, { signal, timeoutMs: RECOVERY_TIMEOUT_MS, label: "benchmark recovery reset" });
}

async function waitForMainThreadRecovery(signal) {
    let stableFrames = 0;
    let previous = performance.now();
    while (stableFrames < RECOVERY_STABLE_FRAMES) {
        throwIfAborted(signal);
        await animationFrame(signal);
        const now = performance.now();
        const frameMs = now - previous;
        previous = now;
        stableFrames = frameMs < 250 ? stableFrames + 1 : 0;
        if (frameMs >= 250) {
            await delay(Math.min(1000, Math.max(100, frameMs)), signal);
        }
    }
}

function animationFrame(signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(abortError(signal.reason));
            return;
        }
        let frame = 0;
        const onAbort = () => {
            cancelAnimationFrame(frame);
            reject(abortError(signal?.reason));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        frame = requestAnimationFrame(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        });
    });
}

async function resetSimulationForBenchmarkWithWatchdog(payload, scenario, signal) {
    const timeoutMs = Math.max(
        SETUP_TIMEOUT_BASE_MS,
        SETUP_TIMEOUT_BASE_MS + (Number(scenario?.cells) || 0) * SETUP_TIMEOUT_PER_ENTITY_MS + (Number(scenario?.food) || 0) * SETUP_TIMEOUT_PER_ENTITY_MS
    );
    return requestJson("/api/simulation/benchmark/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {}),
    }, { signal, timeoutMs, label: "benchmark setup" });
}

function resetPerformanceMetricsWithWatchdog(signal) {
    return requestJson("/api/simulation/metrics/performance/reset", {
        method: "POST",
    }, { signal, timeoutMs: REQUEST_TIMEOUT_MS, label: "metrics reset" });
}

function getPerformanceMetricsWithWatchdog(signal) {
    return requestJson("/api/simulation/metrics/performance", {}, { signal, timeoutMs: METRICS_TIMEOUT_MS, label: "metrics snapshot" });
}

async function openSyntheticClients(count, layers, signal) {
    const clients = [];
    try {
        for (let i = 0; i < count; i++) {
            throwIfAborted(signal);
            clients.push(await openSyntheticClient(i, layers, signal));
        }
        return clients;
    } catch (error) {
        closeClients(clients);
        throw error;
    }
}

function openSyntheticClient(index, layers, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(abortError(signal.reason));
            return;
        }
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const ws = new WebSocket(`${protocol}://${window.location.host}/ws/simulation`);
        ws.binaryType = "arraybuffer";
        const state = {
            decodeSamples: [],
            inboundBytes: 0,
            frameCount: 0,
            lastFlush: performance.now(),
            timer: null,
        };

        let settled = false;
        const failTimer = setTimeout(() => finish(new Error(`Synthetic WebSocket client ${index} timeout`)), SYNTHETIC_CLIENT_TIMEOUT_MS);
        const abortListener = () => finish(abortError(signal?.reason));
        signal?.addEventListener("abort", abortListener, { once: true });

        function finish(value) {
            if (settled) return;
            settled = true;
            clearTimeout(failTimer);
            signal?.removeEventListener("abort", abortListener);
            if (value instanceof Error) {
                try { ws.close(); } catch (ignored) {}
                reject(value);
            } else {
                resolve(value);
            }
        }

        ws.onopen = () => {
            try {
                ws.send(JSON.stringify({
                    type: "subscribe",
                    ...layers,
                    selectedCellId: null,
                    selectedCellMode: "general",
                    viewport: null,
                }));
                state.timer = setInterval(() => flushSyntheticMetrics(ws, state), 1000);
                finish({ ws, state });
            } catch (error) {
                finish(error);
            }
        };
        ws.onerror = () => finish(new Error(`Synthetic WebSocket client ${index} failed`));
        ws.onmessage = event => {
            const started = performance.now();
            let message;
            if (event.data instanceof ArrayBuffer) {
                state.inboundBytes += event.data.byteLength;
                message = decodeBinaryRenderFrame(event.data);
            } else {
                state.inboundBytes += event.data?.length ?? 0;
                message = JSON.parse(event.data);
            }
            state.decodeSamples.push(performance.now() - started);
            if (message?.type === "renderFrame" || message?.type === "world") {
                state.frameCount++;
            }
        };
        ws.onclose = () => {
            clearTimeout(failTimer);
            signal?.removeEventListener("abort", abortListener);
            if (state.timer) clearInterval(state.timer);
        };
    });
}

function flushSyntheticMetrics(ws, state) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const now = performance.now();
    const elapsedSeconds = Math.max(0.001, (now - state.lastFlush) / 1000);
    const fps = state.frameCount / elapsedSeconds;
    ws.send(JSON.stringify({
        type: "clientMetrics",
        timestamp: Date.now(),
        fps,
        decodeTimeMs: summarizeSamples(state.decodeSamples),
        drawTimeMs: { count: 0, avg: 0, min: 0, max: 0 },
        inboundPayloadBytes: state.inboundBytes,
        droppedFrames: 0,
    }));
    state.decodeSamples.length = 0;
    state.inboundBytes = 0;
    state.frameCount = 0;
    state.lastFlush = now;
}

function closeClients(clients) {
    for (const client of clients) {
        try {
            if (client.state.timer) clearInterval(client.state.timer);
            client.ws.close();
        } catch (ignored) {
        }
    }
}

function summarizeSamples(samples) {
    if (!samples.length) return { count: 0, avg: 0, min: 0, max: 0 };
    let total = 0;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const sample of samples) {
        total += sample;
        min = Math.min(min, sample);
        max = Math.max(max, sample);
    }
    return { count: samples.length, avg: total / samples.length, min, max };
}

function cleanErrorMessage(error) {
    const message = String(error?.message ?? error ?? "Benchmark failed").trim();
    return message || "Benchmark failed";
}

function metricAverage(metric) {
    return numberOrNull(metric?.avg);
}

function numberOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function sanitizeDuration(value, fallback, min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.round(number));
}

function sanitizeClientCount(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.round(number));
}

function sanitizeWsClientCount(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(1, Math.round(number));
}

function startMainThreadLagMonitor(intervalMs = 250) {
    let maxLag = 0;
    let last = performance.now();
    const timer = setInterval(() => {
        const now = performance.now();
        maxLag = Math.max(maxLag, now - last - intervalMs);
        last = now;
    }, intervalMs);
    return {
        maxLag: () => Math.max(0, maxLag, performance.now() - last - intervalMs),
        stop: () => clearInterval(timer),
    };
}

function delay(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(abortError(signal.reason));
            return;
        }
        let timer = 0;
        const onAbort = () => {
            clearTimeout(timer);
            reject(abortError(signal?.reason));
        };
        timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, Math.max(0, ms));
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

async function requestJson(url, options = {}, { signal = null, timeoutMs = REQUEST_TIMEOUT_MS, label = "request" } = {}) {
    throwIfAborted(signal);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        const error = new Error(`${label} timed out after ${timeoutMs} ms`);
        error.name = "TimeoutError";
        error.code = "BENCHMARK_ABORTED";
        controller.abort(error);
    }, Math.max(1, timeoutMs));

    const abortListener = () => controller.abort(abortError(signal?.reason));
    signal?.addEventListener("abort", abortListener, { once: true });

    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (!response.ok) {
            let details = "";
            try { details = await response.text(); } catch (ignored) {}
            throw new Error(`${options.method || "GET"} ${url} failed: ${response.status}${details ? ` | ${details}` : ""}`);
        }
        return response.json();
    } catch (error) {
        if (controller.signal.aborted) {
            const reason = controller.signal.reason;
            if (reason instanceof Error) {
                throw reason;
            }
            throw abortError(reason);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abortListener);
    }
}

function throwIfAborted(signal) {
    if (signal?.aborted) {
        throw abortError(signal.reason);
    }
}

function timeoutError(message, code = "BENCHMARK_TIMEOUT") {
    const error = new Error(message || "Benchmark timed out");
    error.name = "TimeoutError";
    error.code = code;
    return error;
}

function abortError(reason) {
    if (reason instanceof Error) return reason;
    const error = new Error(String(reason || "Benchmark aborted"));
    error.name = "AbortError";
    error.code = "BENCHMARK_ABORTED";
    return error;
}
