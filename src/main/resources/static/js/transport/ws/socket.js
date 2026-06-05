import { refreshSelection } from "../../ui/tabs/selection.js";
import { state, setWorld, setMetrics, resetMetrics } from "../../store/state.js";
import { updateStats } from "../../store/actions.js";
import { getCanvasCameraState } from "../../ui/panels/canvas-camera.js";

let socket = null;
let pendingWorldMessage = null;
let pendingMetricsMessage = null;
let socketFlushScheduled = false;
let lastDisplayLayersPayload = "";
let lastStatsRefreshMs = 0;
let selectionRefreshDeferred = false;

const STATS_REFRESH_INTERVAL_MS = 120;

function scheduleSocketFlush() {
    if (socketFlushScheduled) {
        return;
    }
    socketFlushScheduled = true;
    requestAnimationFrame(flushSocketMessages);
}

function flushSocketMessages() {
    socketFlushScheduled = false;

    const world = pendingWorldMessage;
    const metrics = pendingMetricsMessage;
    pendingWorldMessage = null;
    pendingMetricsMessage = null;

    if (world) {
        setWorld(world);

        if (isCameraInteractionActive()) {
            selectionRefreshDeferred = true;
        } else {
            refreshSelection(selectionRefreshDeferred);
            selectionRefreshDeferred = false;
        }
    }
    if (metrics) {
        setMetrics(metrics);
    }

    if (world || metrics) {
        updateStatsThrottled();
    }

    if (pendingWorldMessage || pendingMetricsMessage) {
        scheduleSocketFlush();
    }
}

export function connectSocket() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    socket = new WebSocket(`${protocol}://${window.location.host}/ws/simulation`);
    socket.onopen = () => {
        console.log("WebSocket connected");
        lastDisplayLayersPayload = "";
        sendDisplayLayers({ force: true });
    };
    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "world") {
            pendingWorldMessage = message;
            scheduleSocketFlush();
        }
        else if (message.type === "metrics") {
            pendingMetricsMessage = message;
            scheduleSocketFlush();
        }
    };
    socket.onclose = () => {
        pendingWorldMessage = null;
        pendingMetricsMessage = null;
        resetMetrics();
        lastDisplayLayersPayload = "";
        console.log("WebSocket disconnected. Reconnecting...");
        setTimeout(connectSocket, 1000);
    };
    socket.onerror = (error) => {
        console.error("WebSocket error", error);
        socket.close();
    };
}

export function sendDisplayLayers({ force = false } = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }

    const payload = JSON.stringify({
        type: "displayLayers",
        ...state.displayLayers,
        selectedCellId: state.selectedCellId ?? null,
        selectedCellMode: state.selectedPreviewMode ?? "general",
    });

    if (!force && payload === lastDisplayLayersPayload) {
        return;
    }

    lastDisplayLayersPayload = payload;
    socket.send(payload);
}

function updateStatsThrottled() {
    const now = performance.now();
    if (now - lastStatsRefreshMs < STATS_REFRESH_INTERVAL_MS) {
        return;
    }

    lastStatsRefreshMs = now;
    updateStats();
}

function isCameraInteractionActive() {
    try {
        const camera = getCanvasCameraState();
        return Boolean(camera.dragging || camera.moving || camera.zooming);
    } catch (ignored) {
        return false;
    }
}


