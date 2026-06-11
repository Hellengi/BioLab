import { refreshSelection } from "../../ui/tabs/selection.js";
import {
    state,
    setRenderFrame,
    setLightingFrame,
    setCellDetails,
    setMetrics,
    resetMetrics,
} from "../../store/state.js";
import { updateStats } from "../../store/actions.js";
import { getCanvasCameraState, getVisibleWorldBounds } from "../../ui/panels/canvas-camera.js";
import { decodeBinaryRenderFrame } from "./binary-render-frame.js";
import { configureClientMetricsSender, recordClientDecodeTime } from "../../metrics/client-metrics.js";

let socket = null;
let pendingRenderFrame = null;
let pendingLightingFrame = null;
let pendingCellDetails = null;
let pendingMetricsMessage = null;
let socketFlushScheduled = false;
let lastDisplayLayersPayload = "";
let lastStatsRefreshMs = 0;
let selectionRefreshDeferred = false;

const STATS_REFRESH_INTERVAL_MS = 120;
const VIEWPORT_SUBSCRIPTION_MARGIN = 128;
const SERVER_MESSAGE_TYPES = Object.freeze({
    world: "world",
    renderFrame: "renderFrame",
    lightingFrame: "lightingFrame",
    cellDetails: "cellDetails",
    metrics: "metrics",
});

function scheduleSocketFlush() {
    if (socketFlushScheduled) {
        return;
    }
    socketFlushScheduled = true;
    requestAnimationFrame(flushSocketMessages);
}

function flushSocketMessages() {
    socketFlushScheduled = false;

    const renderFrame = pendingRenderFrame;
    const lightingFrame = pendingLightingFrame;
    const cellDetails = pendingCellDetails;
    const metrics = pendingMetricsMessage;
    pendingRenderFrame = null;
    pendingLightingFrame = null;
    pendingCellDetails = null;
    pendingMetricsMessage = null;

    let selectionNeedsRefresh = false;

    if (renderFrame) {
        setRenderFrame(renderFrame);
        selectionNeedsRefresh = true;
    }
    if (lightingFrame) {
        setLightingFrame(lightingFrame);
    }
    if (cellDetails) {
        setCellDetails(cellDetails);
        selectionNeedsRefresh = true;
    }
    if (metrics) {
        setMetrics(metrics);
    }

    if (selectionNeedsRefresh) {
        if (isCameraInteractionActive()) {
            selectionRefreshDeferred = true;
        } else {
            refreshSelection(selectionRefreshDeferred);
            selectionRefreshDeferred = false;
        }
    }

    if (renderFrame || lightingFrame || cellDetails || metrics) {
        updateStatsThrottled();
    }

    if (pendingRenderFrame || pendingLightingFrame || pendingCellDetails || pendingMetricsMessage) {
        scheduleSocketFlush();
    }
}

export function connectSocket() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    socket = new WebSocket(`${protocol}://${window.location.host}/ws/simulation`);
    socket.binaryType = "arraybuffer";
    socket.onopen = () => {
        console.log("WebSocket connected");
        configureClientMetricsSender(payload => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(payload));
            }
        });
        lastDisplayLayersPayload = "";
        sendDisplayLayers({ force: true });
    };
    socket.onmessage = (event) => {
        const decodeStart = performance.now();
        let message;
        let payloadBytes = 0;
        if (event.data instanceof ArrayBuffer) {
            payloadBytes = event.data.byteLength;
            message = decodeBinaryRenderFrame(event.data);
        } else {
            payloadBytes = event.data?.length ?? 0;
            message = JSON.parse(event.data);
        }
        recordClientDecodeTime(performance.now() - decodeStart, payloadBytes);

        switch (message.type) {
            case SERVER_MESSAGE_TYPES.world:
            case SERVER_MESSAGE_TYPES.renderFrame:
                pendingRenderFrame = message;
                scheduleSocketFlush();
                break;
            case SERVER_MESSAGE_TYPES.lightingFrame:
                pendingLightingFrame = message;
                scheduleSocketFlush();
                break;
            case SERVER_MESSAGE_TYPES.cellDetails:
                pendingCellDetails = message;
                scheduleSocketFlush();
                break;
            case SERVER_MESSAGE_TYPES.metrics:
                pendingMetricsMessage = message;
                scheduleSocketFlush();
                break;
            default:
                break;
        }
    };
    socket.onclose = () => {
        pendingRenderFrame = null;
        pendingLightingFrame = null;
        pendingCellDetails = null;
        pendingMetricsMessage = null;
        resetMetrics();
        configureClientMetricsSender(null);
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
        type: "subscribe",
        ...state.displayLayers,
        selectedCellId: state.selectedCellId ?? null,
        selectedCellMode: state.selectedPreviewMode ?? "general",
        viewport: currentViewportPayload(),
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
function currentViewportPayload() {
    try {
        const bounds = getVisibleWorldBounds(VIEWPORT_SUBSCRIPTION_MARGIN);
        return {
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            margin: VIEWPORT_SUBSCRIPTION_MARGIN,
        };
    } catch (ignored) {
        return null;
    }
}



