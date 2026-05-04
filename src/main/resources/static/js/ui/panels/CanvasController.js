/**
 * CanvasController.js — обработка кликов по canvas.
 */

import { state, findCellAt } from "../../store/SimulationStore.js";
import { getCanvasCoordinates } from "../ui.js";
import { dom } from "../dom.js";
import { spawnDraftCell, readDraftForm, setPlaceMode } from "./CreationPanel.js";
import { selectCell, clearSelection } from "./SelectionPanel.js";

/**
 * Главный обработчик клика по canvas.
 * Вызывается из events.js, логика — здесь.
 * @param {MouseEvent} event
 */
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

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

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