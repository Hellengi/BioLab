import { state } from "../../store/store.js";
import { dom } from "../dom.js";
import { formatTwoDecimals, getCellRgbString, setText } from "../../core/utils.js";
import { drawSelectedCellPreview } from "../../render/preview.js";
import { getActiveTab, setSelectedTabEnabled, switchTab } from "./tabsPanel.js";

export function selectCell(cell) {
    if (!cell) throw new Error("Environment cell is required");
    state.selectedCellId = cell.id;
    updateSelectedCellPanel(cell);
    showCellContent(true);
    setSelectedTabEnabled(true);
    switchTab("selected");
}

export function clearSelection() {
    state.selectedCellId = null;
    state.selectedCellTemplate = null;
    clearSelectedCellInfo();
    showCellContent(false);

    if (getActiveTab() === "selected") {
        switchTab("control");
    }

    setSelectedTabEnabled(false);
}

export function refreshSelection() {
    if (!state.selectedCellId) return;

    const selectedCell = state.cellById.get(state.selectedCellId);
    if (selectedCell) {
        updateSelectedCellPanel(selectedCell);
    } else {
        clearSelection();
    }
}

function updateSelectedCellPanel(cell) {
    state.selectedCellTemplate = mapWorldCellToTemplate(cell);

    const speed = Math.hypot(cell.vx, cell.vy);
    const genome = state.selectedCellTemplate.genome;

    setText(dom.selectedCellCode, genome.code);
    setText(dom.selectedCellEnergy,
        `${formatTwoDecimals(cell.energy)} / ${formatTwoDecimals(genome.maxEnergy)}`
    );
    setText(dom.selectedCellDivisionThreshold, formatTwoDecimals(genome.divisionThreshold));
    setText(dom.selectedCellDivisionImpulse, formatTwoDecimals(genome.divisionImpulseStrength));
    setText(dom.selectedCellRgb, getCellRgbString(state.selectedCellTemplate));
    setText(dom.selectedCellSpeed, formatTwoDecimals(speed));

    drawSelectedCellPreview(cell, state.selectedCellTemplate);
}

function mapWorldCellToTemplate(cell) {
    return {
        id: null,
        name: null,
        genome: {
            divisionThreshold: cell.genome.divisionThreshold,
            divisionImpulseStrength: cell.genome.divisionImpulseStrength,
            colorHue: cell.genome.colorHue,
            saturation: cell.genome.saturation,
            lightness: cell.genome.lightness,
            maxEnergy: cell.genome.maxEnergy,
            code: cell.genome.code,
        }
    };
}

function showCellContent(hasCell) {
    dom.selectedCellContent?.classList.toggle("hidden", !hasCell);
    dom.saveSelectedCellBtn?.classList.toggle("hidden", !hasCell);
}

export function clearSelectedCellInfo() {
    setText(dom.selectedCellCode, "");
    setText(dom.selectedCellEnergy, "");
    setText(dom.selectedCellDivisionThreshold, "");
    setText(dom.selectedCellDivisionImpulse, "");
    setText(dom.selectedCellRgb, "");
    setText(dom.selectedCellSpeed, "");
    drawSelectedCellPreview(null, null);
}