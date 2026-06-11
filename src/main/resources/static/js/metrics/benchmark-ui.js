import { dom } from "../ui/dom.js";
import { openModal, closeModal } from "../ui/panels/_panels.js";
import { setDisplayLayer, state } from "../store/state.js";
import { applySimulationConfig, handleSimulationReset, loadSimulationConfig } from "../store/actions.js";
import { sendDisplayLayers } from "../transport/ws/socket.js";
import { getConfig, updateConfig } from "../transport/api/simulation.js";
import { appendEventLog, refreshEventLog, registerBenchmarkResultHandler } from "./event-log.js";
import { cloneScenario, scenarioById } from "./baseline-scenarios.js";
import {
    DEFAULT_WS_CLIENTS,
    DEFAULT_RUN_MS,
    DEFAULT_WARMUP_MS,
    benchmarkJsonText,
    createBenchmarkReport,
    downloadBenchmarkJson,
    formatBytes,
    formatNumber,
    formatScenarioSummary,
    isBenchmarkAbortError,
    normalizeBenchmarkReport,
    runBaselineScenario,
    runBaselineSuite,
} from "./benchmark-runner-core.js";

const DISPLAY_LAYER_KEYS = [
    "opacityMap",
    "directedLightMap",
    "scatteredLightMap",
    "lightDirection",
    "quadtree",
    "cellDirections",
];

const BLOCKED_USER_EVENTS = [
    "click",
    "dblclick",
    "pointerdown",
    "pointerup",
    "mousedown",
    "mouseup",
    "input",
    "change",
    "submit",
    "wheel",
    "touchstart",
    "touchend",
    "keydown",
];

const METRIC_COLUMNS = Object.freeze([
    ["Scenario", "Benchmark scenario and selected parameters."],
    ["FPS", "Average client frames per second during the measurement window."],
    ["TPS", "Measured server simulation ticks per second during the measurement window."],
    ["Tick", "Average server simulation tick duration."],
    ["Lock", "Average time synchronized(world) is held."],
    ["Snapshot", "Average time spent copying snapshot data at the simulation boundary."],
    ["Encode", "Average server-side render encoding time."],
    ["Payload", "Average render payload size per frame."],
    ["Dropped", "Frames replaced in latest-only WebSocket queues before sending."],
    ["Decode", "Average browser-side frame decode time."],
    ["Draw", "Average browser-side canvas draw time."],
]);

let running = false;
let lastBenchmarkReport = null;
let currentAbortController = null;
let savedDisplayLayersBeforeBenchmark = null;
let savedWorldConfigBeforeBenchmark = null;
const disabledBeforeBenchmark = new WeakMap();

export function isBenchmarkRunning() {
    return running;
}

export function bindBenchmarkControls() {
    installBenchmarkInteractionBlocker();
    registerBenchmarkResultHandler(showBenchmarkReport);

    dom.benchmarkRunAllBtn?.addEventListener("click", () => {
        void runBenchmarkFromUi(null);
    });

    dom.benchmarkDownloadBtn?.addEventListener("click", () => {
        if (lastBenchmarkReport) {
            downloadBenchmarkJson(lastBenchmarkReport);
        }
    });

    dom.benchmarkCopyJsonBtn?.addEventListener("click", () => {
        if (lastBenchmarkReport) {
            void copyBenchmarkJson(lastBenchmarkReport);
        }
    });

    dom.benchmarkCloseBtn?.addEventListener("click", () => closeModal(dom.benchmarkResultsModal));
    dom.benchmarkResultsModal?.addEventListener("click", event => {
        if (event.target === dom.benchmarkResultsModal && !running) {
            closeModal(dom.benchmarkResultsModal);
        }
    });

    for (const button of dom.benchmarkScenarioButtons ?? []) {
        button.addEventListener("click", () => {
            const scenario = scenarioById(button.dataset.benchmarkScenario);
            if (scenario) {
                void runBenchmarkFromUi(scenario.id);
            }
        });
    }
}

async function runBenchmarkFromUi(scenarioId) {
    if (running) return;

    const baseScenario = scenarioId ? scenarioById(scenarioId) : null;
    const scenario = baseScenario ? cloneScenario(baseScenario) : null;
    const warmupMs = numericInput(dom.benchmarkWarmupMsInput, DEFAULT_WARMUP_MS, 0, 60000);
    const runMs = numericInput(dom.benchmarkRunMsInput, DEFAULT_RUN_MS, 1000, 120000);
    const wsClients = numericInput(dom.benchmarkSyntheticClientsInput, DEFAULT_WS_CLIENTS, 1, Number.POSITIVE_INFINITY);
    const syntheticClients = Math.max(0, wsClients - 1);
    const callbacks = benchmarkCallbacks(Boolean(scenario));

    running = true;
    currentAbortController = new AbortController();
    savedDisplayLayersBeforeBenchmark = { ...(state.displayLayers ?? {}) };
    savedWorldConfigBeforeBenchmark = clonePlain(state.config);
    lastBenchmarkReport = null;
    setBenchmarkUiLocked(true);
    savedWorldConfigBeforeBenchmark = await captureCurrentWorldConfig(savedWorldConfigBeforeBenchmark);
    setBenchmarkResultButtonsEnabled(false);
    updateBenchmarkIndicator(scenario, scenario ? { index: 1, total: 1 } : { index: 1, total: 0 });

    try {
        const singleScenario = scenario
            ? cloneScenario(scenario, { syntheticClients })
            : null;
        const rawResult = singleScenario
            ? await runBaselineScenario(singleScenario, {
                warmupMs,
                runMs,
                callbacks,
                signal: currentAbortController.signal,
                suiteProgress: { index: 1, total: 1 },
            })
            : await runBaselineSuite({ warmupMs, runMs, wsClients, callbacks, signal: currentAbortController.signal });

        lastBenchmarkReport = singleScenario
            ? createBenchmarkReport([rawResult], { mode: "single", warmupMs, runMs, wsClients })
            : normalizeBenchmarkReport(rawResult, { warmupMs, runMs, wsClients });

        await appendBenchmarkResultsToEventLog(lastBenchmarkReport);
        await resetAfterBenchmark();
        restoreDisplayLayersAfterBenchmark();
        await refreshEventLog();
        renderBenchmarkResult(lastBenchmarkReport);
        openModal(dom.benchmarkResultsModal);
    } catch (error) {
        const timedOut = error?.name === "TimeoutError";
        const aborted = isBenchmarkAbortError(error);
        if (timedOut || !aborted) {
            const message = error?.message || String(error);
            await appendEventLog({
                type: timedOut ? "benchmark-watchdog" : "benchmark-error",
                title: timedOut ? "Benchmark watchdog stopped run" : "Benchmark failed",
                body: message,
                tone: timedOut ? "benchmark" : "danger",
                icon: "!",
            });
            console.error("Benchmark failed", error);
        } else {
            console.warn("Benchmark aborted", error);
        }
        try {
            await resetAfterBenchmark();
            restoreDisplayLayersAfterBenchmark();
            await refreshEventLog();
        } catch (resetError) {
            console.error("Benchmark reset failed", resetError);
        }
    } finally {
        restoreDisplayLayersAfterBenchmark();
        running = false;
        currentAbortController = null;
        setBenchmarkUiLocked(false);
        updateBenchmarkIndicator(null, null);
        setBenchmarkResultButtonsEnabled(Boolean(lastBenchmarkReport));
    }
}

function abortRunningBenchmark(reason = "Benchmark cancelled by Escape") {
    if (!running || !currentAbortController || currentAbortController.signal.aborted) return;
    const error = new Error(reason);
    error.name = "AbortError";
    error.code = "BENCHMARK_ABORTED";
    currentAbortController.abort(error);
}

function benchmarkCallbacks(singleRun) {
    return {
        onDisplayLayers: layers => applyBenchmarkDisplayLayers(layers),
        onAfterScenarioReset: async () => {
            try {
                await loadSimulationConfig();
                applySimulationConfig();
            } catch (ignored) {
                // Benchmark metrics are still valid if only the sidebar controls failed to refresh.
            }
        },
        onScenarioStart: (scenario, progress) => {
            updateBenchmarkIndicator(scenario, singleRun ? { index: 1, total: 1 } : progress);
        },
        onWarmupStart: (scenario, warmupMs, progress) => {
            updateBenchmarkIndicator(scenario, singleRun ? { index: 1, total: 1, phase: "warmup" } : { ...progress, phase: "warmup" });
        },
        onMeasureStart: (scenario, runMs, progress) => {
            updateBenchmarkIndicator(scenario, singleRun ? { index: 1, total: 1, phase: "measure" } : { ...progress, phase: "measure" });
        },
        onSyntheticClientsReady: (count, scenario, progress) => {
            const phase = count > 0 ? `${count + 1} clients` : "1 client";
            updateBenchmarkIndicator(scenario, singleRun ? { index: 1, total: 1, phase } : { ...progress, phase });
        },
        onWatchdogWarning: ({ scenario, mainThreadOverrunMs }) => {
            console.warn("Benchmark main thread overrun", scenario?.id, mainThreadOverrunMs);
        },
        onRecoveryStart: progress => {
            applyBenchmarkDisplayLayers({});
            updateBenchmarkIndicator({ shortName: "Recovery reset", name: "Recovery reset" }, { ...progress, phase: "recovery" });
        },
        onRecoveryComplete: progress => {
            updateBenchmarkIndicator({ shortName: "Ready for next", name: "Ready for next" }, { ...progress, phase: "stable" });
        },
    };
}

function applyBenchmarkDisplayLayers(layers) {
    for (const key of DISPLAY_LAYER_KEYS) {
        setDisplayLayer(key, Boolean(layers?.[key]));
        syncDisplayLayerButton(key, Boolean(layers?.[key]));
    }
    sendDisplayLayers({ force: true });
}

function restoreDisplayLayersAfterBenchmark() {
    if (!savedDisplayLayersBeforeBenchmark) return;
    applyBenchmarkDisplayLayers(savedDisplayLayersBeforeBenchmark);
    savedDisplayLayersBeforeBenchmark = null;
}

function syncDisplayLayerButton(layer, enabled) {
    const button = document.querySelector(`[data-layer="${layer}"]`);
    if (!button) return;
    button.classList.toggle("active", enabled);
    button.setAttribute("aria-pressed", String(enabled));
}

async function resetAfterBenchmark() {
    if (savedWorldConfigBeforeBenchmark) {
        state.config = await updateConfig(clonePlain(savedWorldConfigBeforeBenchmark));
        applySimulationConfig();
    }
    await handleSimulationReset();
    savedWorldConfigBeforeBenchmark = null;
}

async function captureCurrentWorldConfig(fallback) {
    try {
        return clonePlain(await getConfig());
    } catch (error) {
        console.warn("Failed to capture current simulation config before benchmark", error);
        return clonePlain(fallback ?? state.config ?? null);
    }
}

function clonePlain(value) {
    if (value == null) return null;
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (ignored) {
        return value;
    }
}

function showBenchmarkReport(report) {
    lastBenchmarkReport = normalizeBenchmarkReport(report);
    renderBenchmarkResult(lastBenchmarkReport);
    openModal(dom.benchmarkResultsModal);
}

function renderBenchmarkResult(report) {
    if (!dom.benchmarkResultsBody) return;

    const normalized = normalizeBenchmarkReport(report);
    const results = normalized.results ?? [];

    dom.benchmarkResultsBody.textContent = "";

    const meta = document.createElement("div");
    meta.className = "benchmark-result-meta";
    meta.textContent = `${results.length} scenario${results.length === 1 ? "" : "s"} · warmup ${normalized.parameters.warmupMs} ms · run ${normalized.parameters.runMs} ms · speed 1x · generated ${formatDateTime(normalized.generatedAt)}`;
    dom.benchmarkResultsBody.appendChild(meta);

    const tableWrap = document.createElement("div");
    tableWrap.className = "benchmark-result-table-wrap";
    const table = document.createElement("table");
    table.className = "benchmark-result-table";
    const thead = document.createElement("thead");
    thead.appendChild(row(METRIC_COLUMNS.map(([label, title]) => ({ label, title })), "th"));
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const item of results) {
        const summary = item.summary ?? {};
        tbody.appendChild(row([
            scenarioLabel(item),
            formatNumber(summary.clientFps, 1),
            formatNumber(summary.serverTps, 0),
            `${formatNumber(summary.tickTimeMs)} ms`,
            `${formatNumber(summary.worldLockHoldMs)} ms`,
            `${formatNumber(summary.snapshotCopyMs)} ms`,
            `${formatNumber(summary.renderEncodeMs)} ms`,
            formatBytes(summary.renderPayloadBytes),
            formatNumber(summary.droppedFrames, 0),
            `${formatNumber(summary.clientDecodeMs)} ms`,
            `${formatNumber(summary.clientDrawMs)} ms`,
        ], "td"));
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    dom.benchmarkResultsBody.appendChild(tableWrap);

    const details = document.createElement("details");
    details.className = "benchmark-raw-details";
    const summary = document.createElement("summary");
    summary.textContent = "Raw JSON preview";
    const pre = document.createElement("pre");
    pre.textContent = benchmarkJsonText(normalized);
    details.append(summary, pre);
    dom.benchmarkResultsBody.appendChild(details);

    setBenchmarkResultButtonsEnabled(true);
}

function row(values, cellTag) {
    const tr = document.createElement("tr");
    for (const value of values) {
        const cell = document.createElement(cellTag);
        const label = typeof value === "object" && value !== null ? value.label : value;
        const title = typeof value === "object" && value !== null ? value.title : null;
        cell.textContent = label;
        if (title) cell.title = title;
        tr.appendChild(cell);
    }
    return tr;
}

function scenarioLabel(item) {
    const scenario = item.scenario ?? {};
    const parts = [scenario.shortName ?? scenario.name ?? "Scenario"];
    if (Number(scenario.wsClients) > 1) parts.push(`${scenario.wsClients} WS clients`);
    if (scenario.lighting?.localLightSourcesEnabled) parts.push(`${scenario.lighting.lightSourceCount ?? "?"} lights`);
    if (hasDebugLayers(scenario.layers)) parts.push("debug layers");
    if (isFailedResult(item)) parts.push("failed");
    return parts.join(" · ");
}

function isFailedResult(item) {
    return Boolean(item?.summary?.failed || item?.error || item?.summary?.error);
}

async function appendBenchmarkResultsToEventLog(report) {
    const normalized = normalizeBenchmarkReport(report);
    const suite = normalized.mode === "suite" || (normalized.results?.length ?? 0) > 1;
    await appendEventLog({
        type: "benchmark-result",
        title: suite ? "Benchmark suite" : (normalized.results?.[0]?.scenario?.shortName ?? normalized.results?.[0]?.scenario?.name ?? "Benchmark"),
        body: suite ? suiteEventSummary(normalized) : eventSummary(normalized.results?.[0]),
        tone: "benchmark",
        icon: "B",
        payload: { benchmarkReport: normalized },
    });
}

function eventSummary(result) {
    const scenario = result?.scenario ?? {};
    const params = [
        `${scenario.cells ?? "?"} cells`,
        `${scenario.food ?? "?"} food`,
        hasDebugLayers(scenario.layers) ? "debug on" : "debug off",
    ];
    if (scenario.lighting?.localLightSourcesEnabled) {
        params.push(`${scenario.lighting.lightSourceCount ?? "?"} lights`);
    }
    if (Number(scenario.wsClients) > 1) {
        params.push(`${scenario.wsClients} WS clients`);
    }
    return `${params.join(" / ")} → ${formatScenarioSummary(result)}`;
}

function suiteEventSummary(report) {
    const results = report?.results ?? [];
    const fpsValues = results
        .map(result => Number(result?.summary?.clientFps))
        .filter(Number.isFinite);
    const averageFps = fpsValues.length
        ? fpsValues.reduce((sum, value) => sum + value, 0) / fpsValues.length
        : null;
    const tpsValues = results
        .map(result => Number(result?.summary?.serverTps))
        .filter(Number.isFinite);
    const averageTps = tpsValues.length
        ? tpsValues.reduce((sum, value) => sum + value, 0) / tpsValues.length
        : null;
    const failed = results.filter(isFailedResult).length;
    const failedText = failed > 0 ? ` · ${failed} failed` : "";
    return `Run all baseline scenarios → ${results.length} scenarios · avg FPS ${formatNumber(averageFps, 1)} · avg TPS ${formatNumber(averageTps, 0)}${failedText}`;
}

function setBenchmarkUiLocked(locked) {
    document.body.classList.toggle("benchmark-running", locked);
    setPageControlsDisabled(locked);
    if (locked) {
        closeModal(dom.benchmarkResultsModal);
    }
}

function setPageControlsDisabled(disabled) {
    const controls = document.querySelectorAll("button, input, select, textarea");
    for (const control of controls) {
        if (!(control instanceof HTMLButtonElement || control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) {
            continue;
        }
        if (disabled) {
            if (!disabledBeforeBenchmark.has(control)) {
                disabledBeforeBenchmark.set(control, control.disabled);
            }
            control.disabled = true;
        } else if (disabledBeforeBenchmark.has(control)) {
            control.disabled = disabledBeforeBenchmark.get(control);
            disabledBeforeBenchmark.delete(control);
        }
    }
}

function installBenchmarkInteractionBlocker() {
    if (installBenchmarkInteractionBlocker.installed) return;
    installBenchmarkInteractionBlocker.installed = true;

    for (const type of BLOCKED_USER_EVENTS) {
        document.addEventListener(type, event => {
            if (!running) return;
            if (type === "keydown" && event.key === "Escape") {
                event.preventDefault();
                event.stopImmediatePropagation();
                abortRunningBenchmark();
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
        }, { capture: true, passive: false });
    }
}

function updateBenchmarkIndicator(scenario, progress) {
    const active = Boolean(scenario && running);
    dom.timeSlider?.classList.toggle("hidden", active);
    dom.pauseBtn?.classList.toggle("hidden", active);
    dom.resetBtn?.classList.toggle("hidden", active);
    dom.benchmarkToolbarIndicator?.classList.toggle("hidden", !active);

    if (!active) {
        if (dom.benchmarkToolbarTitle) dom.benchmarkToolbarTitle.textContent = "";
        if (dom.benchmarkToolbarProgress) dom.benchmarkToolbarProgress.textContent = "";
        return;
    }

    const name = scenario.shortName ?? scenario.name ?? "Benchmark";
    if (dom.benchmarkToolbarTitle) {
        dom.benchmarkToolbarTitle.textContent = name;
    }
    if (dom.benchmarkToolbarProgress) {
        const total = Number(progress?.total ?? 1);
        const index = Number(progress?.index ?? 1);
        const progressText = total > 1 ? `${index}/${total}` : "single";
        const phase = progress?.phase ?? "setup";
        renderToolbarSegments(dom.benchmarkToolbarProgress, [progressText, phase, "speed 1x"]);
    }
}

function renderToolbarSegments(container, values) {
    container.textContent = "";
    values.filter(Boolean).forEach((value, index) => {
        if (index > 0) {
            const separator = document.createElement("span");
            separator.className = "benchmark-toolbar-separator";
            separator.setAttribute("aria-hidden", "true");
            container.appendChild(separator);
        }
        const segment = document.createElement("span");
        segment.className = "benchmark-toolbar-segment";
        segment.textContent = value;
        container.appendChild(segment);
    });
}

async function copyBenchmarkJson(report) {
    const text = benchmarkJsonText(report);
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            fallbackCopyText(text);
        }
        flashCopyButton("Copied");
    } catch (error) {
        console.error("Failed to copy benchmark JSON", error);
        fallbackCopyText(text);
        flashCopyButton("Copied");
    }
}

function fallbackCopyText(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
}

function flashCopyButton(label) {
    if (!dom.benchmarkCopyJsonBtn) return;
    const previous = dom.benchmarkCopyJsonBtn.textContent;
    dom.benchmarkCopyJsonBtn.textContent = label;
    setTimeout(() => {
        if (dom.benchmarkCopyJsonBtn) dom.benchmarkCopyJsonBtn.textContent = previous || "Copy JSON";
    }, 1200);
}

function setBenchmarkResultButtonsEnabled(enabled) {
    if (dom.benchmarkDownloadBtn) dom.benchmarkDownloadBtn.disabled = !enabled;
    if (dom.benchmarkCopyJsonBtn) dom.benchmarkCopyJsonBtn.disabled = !enabled;
}

function hasDebugLayers(layers) {
    return Boolean(layers?.opacityMap || layers?.directedLightMap || layers?.scatteredLightMap || layers?.lightDirection || layers?.quadtree || layers?.cellDirections);
}

function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value ?? "—");
    return date.toLocaleString();
}

function numericInput(input, fallback, min, max) {
    const value = Number(input?.value);
    return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
}
