import { state, findCellAt } from "../../store/store.js";
import { getCanvasCoordinates } from "../panels.js";
import { spawnDraftCell, readDraftForm } from "./creationPanel.js";
import { selectCell, clearSelection } from "./selectionPanel.js";

export function onCanvasClick(event) {
    const { x, y } = getCanvasCoordinates(event);

    if (state.placeMode && state.cellDraft) {
        handlePlaceModeClick(x, y);
        return;
    }

    const clickedCell = findCellAt(x, y);

    if (clickedCell) {
        selectCell(clickedCell);
        return;
    }

    clearSelection();
}

function handlePlaceModeClick(x, y) {
    try {
        state.cellDraft = readDraftForm();
    } catch (err) {
        console.error("Create cell form error", err);
        alert("Check the values in the cell creation form\n");
        return;
    }

    spawnDraftCell(x, y).catch(err => {
        console.error("Spawn cell error", err);
        alert("Failed to create cell");
    });
}