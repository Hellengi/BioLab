import { dom } from "./dom.js";

export function bindInputs(rangeInput, numberInput, onInput, onCommit = onInput) {
    if (!rangeInput || !numberInput) return;

    const syncFromRange = () => {
        numberInput.value = rangeInput.value;
        onInput();
    };

    const syncFromNumber = () => {
        rangeInput.value = numberInput.value;
        onInput();
    };

    const commitFromRange = () => {
        numberInput.value = rangeInput.value;
        onCommit();
    };

    const commitFromNumber = () => {
        rangeInput.value = numberInput.value;
        onCommit();
    };

    rangeInput.addEventListener("input", syncFromRange);
    rangeInput.addEventListener("change", commitFromRange);
    rangeInput.addEventListener("pointerup", commitFromRange);

    numberInput.addEventListener("input", syncFromNumber);
    numberInput.addEventListener("change", commitFromNumber);
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