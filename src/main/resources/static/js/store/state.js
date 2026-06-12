export const state = {
    world: null,
    config: null,
    selectedCellId: null,
    selectedStrain: null,
    cellDraft: null,
    cellDraftPreview: null,
    cellDraftPreviewSignature: "",
    placeMode: false,
    settingsDraft: null,
    cellById: new Map(),
    selectedCellDetailsById: new Map(),
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
        directedLightMap: false,
        scatteredLightMap: false,
        lightDirection: false,
        spatialGrid: false,
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
    // Backward-compatible entry point for REST / full world payloads.
    setRenderFrame(dto);
}

export function setRenderFrame(dto) {
    const previousCellIndex = state.cellById;
    const previousSelectedCell = state.selectedCellId
        ? (previousCellIndex.get(state.selectedCellId) ?? null)
        : null;

    const previousLighting = state.world?.lighting ?? null;
    const cells = (dto.cells ?? []).map(cell => mergeRenderCellWithDetails(cell));

    state.world = {
        ...dto,
        type: dto.type ?? "renderFrame",
        cells,
        foods: dto.foods ?? [],
        lighting: mergeLighting(previousLighting, dto.lighting),
    };

    applyTpsUpdate(dto.tps);

    rebuildCellIndex();
    updateSelectedCellContinuity(previousSelectedCell);
}

export function setLightingFrame(dto) {
    if (!dto?.lighting) return;
    if (!state.world) {
        state.world = {
            type: "lightingFrame",
            tick: dto.tick ?? 0,
            time: dto.time ?? 0,
            foodSpawnProgress: 0,
            tubeDiameter: state.config?.tubeDiameter ?? 0,
            cells: [],
            foods: [],
            lighting: dto.lighting,
        };
        return;
    }

    state.world = {
        ...state.world,
        tick: dto.tick ?? state.world.tick,
        time: dto.time ?? state.world.time,
        lighting: mergeLighting(state.world.lighting, dto.lighting),
    };
}

export function setCellDetails(dto) {
    const cellId = dto?.cellId ?? dto?.cell?.id ?? null;
    if (cellId == null) return;

    if (dto.cell == null) {
        state.selectedCellDetailsById.delete(cellId);
        rebuildCellIndex();
        return;
    }

    state.selectedCellDetailsById.set(cellId, dto.cell);
    if (state.world?.cells) {
        state.world = {
            ...state.world,
            cells: state.world.cells.map(cell => cell.id === cellId ? mergeRenderCellWithDetails(cell) : cell),
        };
        rebuildCellIndex();
    }
}

export function setMetrics(dto) {
    applyTpsUpdate(dto?.tps);
}

export function resetMetrics() {
    state.tps = 0;
}

function rebuildCellIndex() {
    state.cellById = new Map(
        (state.world?.cells ?? []).map(cell => [cell.id, cell])
    );
}

function mergeRenderCellWithDetails(renderCell) {
    const details = state.selectedCellDetailsById.get(renderCell.id);
    if (!details) return renderCell;

    return {
        ...details,
        ...renderCell,
        genome: details.genome,
        events: details.events,
        motion: details.motion,
        lysosomeSlots: mergeSlots(renderCell.lysosomeSlots, details.lysosomeSlots),
        flagellumSlots: mergeSlots(renderCell.flagellumSlots, details.flagellumSlots),
    };
}

function mergeSlots(renderSlots, detailSlots) {
    if (!Array.isArray(renderSlots)) return Array.isArray(detailSlots) ? detailSlots : [];
    if (!Array.isArray(detailSlots) || detailSlots.length === 0) return renderSlots;

    const detailsByIndex = new Map(detailSlots.map(slot => [slot.index, slot]));
    return renderSlots.map(renderSlot => ({
        ...(detailsByIndex.get(renderSlot.index) ?? {}),
        ...renderSlot,
    }));
}

function mergeLighting(previous, incoming) {
    if (!incoming) return previous ?? null;
    if (!previous) return incoming;

    const compatible = previous.gridWidth === incoming.gridWidth
        && previous.gridHeight === incoming.gridHeight
        && previous.gridStep === incoming.gridStep;

    return {
        ...previous,
        ...incoming,
        lightMap: definedMap(incoming.lightMap) ?? (compatible ? previous.lightMap : incoming.lightMap),
        directedLightMap: definedMap(incoming.directedLightMap) ?? (compatible ? previous.directedLightMap : incoming.directedLightMap),
        scatteredLightMap: definedMap(incoming.scatteredLightMap) ?? (compatible ? previous.scatteredLightMap : incoming.scatteredLightMap),
        opacityMap: definedMap(incoming.opacityMap) ?? (compatible ? previous.opacityMap : incoming.opacityMap),
        lightDirectionArrows: definedMap(incoming.lightDirectionArrows) ?? (compatible ? previous.lightDirectionArrows : incoming.lightDirectionArrows),
        spatialGridCells: Array.isArray(incoming.spatialGridCells) && incoming.spatialGridCells.length > 0
            ? incoming.spatialGridCells
            : (compatible ? previous.spatialGridCells : incoming.spatialGridCells),
    };
}

function definedMap(value) {
    return Array.isArray(value) && value.length > 0 ? value : null;
}

function applyTpsUpdate(value) {
    if (value == null) return;

    const tps = Number(value);
    if (Number.isFinite(tps)) {
        state.tps = tps;
    }
}

function updateSelectedCellContinuity(previousSelectedCell) {
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



