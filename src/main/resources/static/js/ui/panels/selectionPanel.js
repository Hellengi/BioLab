import { state } from "../../store/store.js";
import { dom } from "../dom.js";
import { showSidePanel, SidePanel } from "../panels.js";
import { formatTwoDecimals, getCellRgbString, setText } from "../../core/utils.js";
import { drawSelectedCellPreview } from "../../render/preview.js";

export function selectCell(cell) {
    if (!cell) throw new Error("Environment cell is required");

    state.selectedCellId = cell.id;
    updateSelectedCellPanel(cell);
    showSidePanel(SidePanel.SELECTED);
}

export function clearSelection() {
    state.selectedCellId = null;
    state.selectedCellTemplate = null;
    if (dom.saveSelectedCellNameInput) dom.saveSelectedCellNameInput.value = "";
    clearSelectedCellInfo();
    showSidePanel(state.cellDraft ? SidePanel.CREATE : SidePanel.EMPTY);
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

export function clearSelectedCellInfo() {
    setText(dom.selectedCellCode, "");
    setText(dom.selectedCellEnergy, "");
    setText(dom.selectedCellDivisionThreshold, "");
    setText(dom.selectedCellDivisionImpulse, "");
    setText(dom.selectedCellRgb, "");
    setText(dom.selectedCellSpeed, "");
    drawSelectedCellPreview(null, null);
}