import { refreshSelection } from "../../ui/tabs/selection.js";
import {setWorld, setMetrics, resetMetrics} from "../../store/state.js";
import {updateStats} from "../../store/actions.js";

let socket = null;

export function connectSocket() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    socket = new WebSocket(`${protocol}://${window.location.host}/ws/simulation`);
    socket.onopen = () => {
        console.log("WebSocket connected");
    };
    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "world") {
            setWorld(message);
            refreshSelection();
            updateStats();
        }
        else if (message.type === "metrics") {
            setMetrics(message);
        }
    };
    socket.onclose = () => {
        resetMetrics();
        console.log("WebSocket disconnected. Reconnecting...");
        setTimeout(connectSocket, 1000);
    };
    socket.onerror = (error) => {
        console.error("WebSocket error", error);
        socket.close();
    };
}