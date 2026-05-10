export const state = {
    world: null,
    config: null,
    selectedCellId: null,
    selectedCellTemplate: null,
    cellDraft: null,
    placeMode: false,
    settingsDraft: null,
    cellById: new Map(),
    prevDeadCellsById: new Map(),
    deadCellDisappearEffects: [],

    pendingTimeSlider: null,

    fps: 0,
    tps: 0,

    cursorLight: null,
};

export function setCursorLight(value) {
    state.cursorLight = value;
}

export const sliderState = {
    isDragging: false,
};

export function getSelectedCell() {
    return state.selectedCellId
        ? (state.cellById.get(state.selectedCellId) ?? null)
        : null;
}

export function findCellAt(x, y) {
    if (!state.world?.cells) return null;
    for (let i = state.world.cells.length - 1; i >= 0; i--) {
        const cell = state.world.cells[i];
        const dx = x - cell.x;
        const dy = y - cell.y;
        if (dx * dx + dy * dy <= cell.radius * cell.radius) return cell;
    }
    return null;
}

export function setWorld(worldDto) {
    state.world = worldDto;
    state.tps = worldDto.tps ?? 0;
    rebuildCellIndex();
}

export function rebuildCellIndex() {
    state.cellById = new Map(
        (state.world?.cells ?? []).map(cell => [cell.id, cell])
    );
}