import { state } from "../../store/store.js";
import { dom } from "../dom.js";

export function updateCursorReadout() {
    if (!dom.cursorReadoutDisplay) return;

    const light = state.cursorLight;

    if (light === null) {
        dom.cursorReadoutDisplay.textContent = "—";
        dom.cursorReadoutDisplay.classList.remove("cursor-readout--active");
        return;
    }

    dom.cursorReadoutDisplay.textContent = `${(light * 100).toFixed(2)}%`;
    dom.cursorReadoutDisplay.classList.add("cursor-readout--active");
}