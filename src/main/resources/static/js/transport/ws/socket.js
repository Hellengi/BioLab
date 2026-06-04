import { refreshSelection } from "../../ui/tabs/selection.js";
import { state, setWorld, setMetrics, resetMetrics } from "../../store/state.js";
import { updateStats } from "../../store/actions.js";

let socket = null;
let pendingWorldMessage = null;
let pendingMetricsMessage = null;
let socketFlushScheduled = false;

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
        refreshSelection();
        updateStats();
    }
    if (metrics) {
        setMetrics(metrics);
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
        sendDisplayLayers();
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
        console.log("WebSocket disconnected. Reconnecting...");
        setTimeout(connectSocket, 1000);
    };
    socket.onerror = (error) => {
        console.error("WebSocket error", error);
        socket.close();
    };
}

export function sendDisplayLayers() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }

    socket.send(JSON.stringify({
        type: "displayLayers",
        ...state.displayLayers,
        selectedCellId: state.selectedCellId ?? null,
        selectedCellMode: state.selectedPreviewMode ?? "general",
    }));
}
