import {dom} from "./dom.js";

export const SidePanel = {
    EMPTY: "empty",
    SELECTED: "selected",
    CREATE: "create"
};

export function bindInputs(rangeInput, numberInput, onChange) {
    if (!rangeInput || !numberInput) {
        return;
    }

    rangeInput.addEventListener("input", () => {
        numberInput.value = rangeInput.value;
        onChange();
    });

    numberInput.addEventListener("input", () => {
        rangeInput.value = numberInput.value;
        onChange();
    });
}

export function showSidePanel(mode) {
    dom.saveSelectedCellSuccess?.classList.remove("visible");
    dom.saveCreateTemplateSuccess?.classList.remove("visible");
    dom.cellPanelEmpty?.classList.add("hidden");
    dom.cellPanelSelected?.classList.add("hidden");
    dom.cellPanelCreate?.classList.add("hidden");

    if (mode === SidePanel.SELECTED) {
        dom.cellPanelSelected?.classList.remove("hidden");
    } else if (mode === SidePanel.CREATE) {
        dom.cellPanelCreate?.classList.remove("hidden");
    } else {
        dom.cellPanelEmpty?.classList.remove("hidden");
    }
}

export function showToast(element) {
    if (!element) {
        return;
    }

    element.classList.add("visible");

    setTimeout(() => {
        element.classList.remove("visible");
    }, 1600);
}

export function getCanvasCoordinates(event) {
    const rect = dom.canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}