import { dom } from "./dom.js";

export function bindInputs(rangeInput, numberInput, onChange) {
    if (!rangeInput || !numberInput) return;

    rangeInput.addEventListener("input", () => {
        numberInput.value = rangeInput.value;
        onChange();
    });

    numberInput.addEventListener("input", () => {
        rangeInput.value = numberInput.value;
        onChange();
    });
}

export function getCanvasCoordinates(event) {
    const rect = dom.canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

export function openModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
}

export function closeModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
}