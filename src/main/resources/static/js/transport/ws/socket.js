/**
 * socket.js — WebSocket-транспорт.
 */

import { setWorld, updateStats } from "../../store/SimulationStore.js";
import { refreshSelection } from "../../ui/panels/SelectionPanel.js";

let socket = null;

export function connectSocket() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    socket = new WebSocket(`${protocol}://${window.location.host}/ws/simulation`);

    socket.onopen = () => {
        console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
        setWorld(JSON.parse(event.data));
        refreshSelection();
        updateStats();
    };

    socket.onclose = () => {
        console.log("WebSocket disconnected. Reconnecting...");
        setTimeout(connectSocket, 1000);
    };

    socket.onerror = (error) => {
        console.error("WebSocket error", error);
        socket.close();
    };
}