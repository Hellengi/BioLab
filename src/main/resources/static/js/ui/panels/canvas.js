import { getCanvasCoordinates } from "./_panels.js";
import { spawnDraftCell, readDraftFromForm } from "../tabs/creation.js";
import { selectCell, clearSelection } from "../tabs/selection.js";
import {findCellAt, state} from "../../store/state.js";

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
        state.cellDraft = readDraftFromForm();
    } catch (err) {
        console.error("Create cell form error", err);
        alert("Check the values in the cell creation form");
        return;
    }

    spawnDraftCell(x, y).catch(err => {
        console.error("Spawn cell error", err);
        alert("Failed to create cell");
    });
}