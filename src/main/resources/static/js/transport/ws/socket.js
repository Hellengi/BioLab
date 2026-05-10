import { state, setWorld, updateStats } from "../../store/store.js";
import { refreshSelection } from "../../ui/panels/selectionPanel.js";

let socket = null;

export function connectSocket() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    socket = new WebSocket(`${protocol}://${window.location.host}/ws/simulation`);

    socket.onopen = () => {
        console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
        const world = JSON.parse(event.data);
        setWorld(world);
        refreshSelection();
        updateStats();
    };

    socket.onclose = () => {
        console.log("WebSocket disconnected. Reconnecting...");
        state.tps = 0;
        setTimeout(connectSocket, 1000);
    };

    socket.onerror = (error) => {
        console.error("WebSocket error", error);
        socket.close();
    };
}