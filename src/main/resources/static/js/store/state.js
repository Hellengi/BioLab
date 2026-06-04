export const state = {
    world: null,
    config: null,
    selectedCellId: null,
    selectedStrain: null,
    cellDraft: null,
    placeMode: false,
    settingsDraft: null,
    cellById: new Map(),
    prevDeadCellsById: new Map(),
    deadCellDisappearEffects: [],
    previewLayerCount: 3,
    selectedPreviewMode: "general",
    selectedInfoScope: "general",
    createInfoScope: "general",
    selectedPreviewNotice: null,

    pendingTimeSlider: null,

    fps: 0,
    tps: 0,

    cursorLight: null,

    displayLayers: {
        opacityMap: false,
        lightDirection: false,
        quadtree: false,
        cellDirections: false,
    },
};

export function setCursorLight(value) {
    state.cursorLight = value;
}

export function setPreviewLayerCount(count) {
    state.previewLayerCount = Math.max(1, Math.min(3, Math.round(Number(count) || 3)));
}

export function setSelectedPreviewMode(mode) {
    const value = String(mode || "general").toLowerCase();
    state.selectedPreviewMode = ["general", "forces", "health", "energy"].includes(value) ? value : "general";
}

export function setSelectedInfoScope(scope) {
    state.selectedInfoScope = String(scope || "general").toLowerCase();
}

export function setCreateInfoScope(scope) {
    state.createInfoScope = String(scope || "general").toLowerCase();
}

export function setDisplayLayer(layer, enabled) {
    if (!Object.hasOwn(state.displayLayers, layer)) return;
    state.displayLayers = {
        ...state.displayLayers,
        [layer]: Boolean(enabled),
    };
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

export function setWorld(dto) {
    const previousCellIndex = state.cellById;
    const previousSelectedCell = state.selectedCellId
        ? (previousCellIndex.get(state.selectedCellId) ?? null)
        : null;

    state.world = dto;
    rebuildCellIndex();

    if (!state.selectedCellId || !previousSelectedCell) {
        _clearExpiredSelectedPreviewNotice();
        return;
    }

    const sameCell = state.cellById.get(state.selectedCellId);
    if (sameCell) {
        if (sameCell.dead) {
            state.selectedPreviewNotice = _newSelectedPreviewNotice("dead");
        } else {
            _clearExpiredSelectedPreviewNotice();
        }
        return;
    }

    const dividedSuccessor = _findDividedSuccessor(previousSelectedCell, state.world?.cells ?? []);
    if (dividedSuccessor) {
        state.selectedCellId = dividedSuccessor.id;
        state.selectedPreviewNotice = _newSelectedPreviewNotice("divided");
        return;
    }

    _clearExpiredSelectedPreviewNotice();
}

export function setMetrics(dto) {
    state.tps = dto.tps ?? 0;
}

export function resetMetrics(dto) {
    state.tps = 0;
}

function rebuildCellIndex() {
    state.cellById = new Map(
        (state.world?.cells ?? []).map(cell => [cell.id, cell])
    );
}

function _findDividedSuccessor(previousCell, cells) {
    if (!previousCell || previousCell.dead || !Array.isArray(cells) || cells.length === 0) return null;

    const previousRadius = Math.max(1, Number(previousCell.radius) || 0);
    const maxDistance = Math.max(22, previousRadius * 1.65);
    const minRadius = previousRadius * 0.34;
    const maxRadius = previousRadius * 0.92;
    const previousGenomeCode = previousCell.genome?.code ?? null;

    let bestCell = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const cell of cells) {
        if (!cell || cell.dead || cell.id === previousCell.id) continue;
        const dx = Number(cell.x) - Number(previousCell.x);
        const dy = Number(cell.y) - Number(previousCell.y);
        const distance = Math.hypot(dx, dy);
        if (!Number.isFinite(distance) || distance > maxDistance) continue;

        const radius = Math.max(0, Number(cell.radius) || 0);
        if (radius < minRadius || radius > maxRadius) continue;
        if (previousGenomeCode && cell.genome?.code && cell.genome.code !== previousGenomeCode) continue;

        const radiusPenalty = Math.abs(radius - previousRadius * 0.5) * 2.2;
        const genomePenalty = previousGenomeCode && cell.genome?.code === previousGenomeCode ? 0 : 4;
        const score = distance + radiusPenalty + genomePenalty;
        if (score < bestScore) {
            bestScore = score;
            bestCell = cell;
        }
    }

    return bestCell;
}

function _newSelectedPreviewNotice(type) {
    if (type === "dead") {
        return { type };
    }

    const startTime = Number(state.world?.time);
    return {
        type,
        startTime: Number.isFinite(startTime) ? startTime : 0.0,
        holdTime: 1.0,
        fadeTime: 0.5,
    };
}

function _clearExpiredSelectedPreviewNotice() {
    const notice = state.selectedPreviewNotice;
    if (!notice || notice.type === "dead") return;
    if (notice.type !== "divided") {
        state.selectedPreviewNotice = null;
        return;
    }

    const currentTime = Number(state.world?.time);
    const startTime = Number(notice.startTime);
    if (!Number.isFinite(currentTime) || !Number.isFinite(startTime)) return;

    const holdTime = Number.isFinite(Number(notice.holdTime)) ? Number(notice.holdTime) : 1.0;
    const fadeTime = Number.isFinite(Number(notice.fadeTime)) ? Number(notice.fadeTime) : 0.5;
    if (currentTime >= startTime + holdTime + fadeTime) {
        state.selectedPreviewNotice = null;
    }
}



