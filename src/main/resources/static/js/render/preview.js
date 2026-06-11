import {preparePreviewCanvas} from "../core/utils.js";
import {drawInternalBioluminescenceGlow} from "./bioluminescence.js";
import {drawBiologyCell} from "./cell-renderer.js";
import {buildSlotIndex, radialOrganelleLayouts} from "./organelle-layout.js";
import {hash01} from "./render-utils.js";
import {t} from "../localization/localization.js";
import {dom} from "../ui/dom.js";
import {setCreateInfoScope, setSelectedInfoScope, state} from "../store/state.js";
import {energyConsumptionFor, energyProductionFor, formatOrganelleEnergy} from "../core/energy-info.js";

const PREVIEW_RADIUS = 42;
const PREVIEW_RADIUS_EXPANDED = 58;

const CREATE_PREVIEW_ZOOM_TIME_CONSTANT_MS = 78;
const CREATE_PREVIEW_ZOOM_STOP_EPS = 0.002;
const CREATE_PREVIEW_PADDING = 12;
const CREATE_PREVIEW_FLAGELLUM_MAX_LENGTH_FACTOR = 4.0;

const _createPreviewZoom = {
    level: 1.0,
    target: 1.0,
    animationId: 0,
    initialized: false,
    lockedToFit: false,
    fitRadius: null,
    fitCx: null,
    fitCy: null,
    fitTargetRadius: null,
    fitTargetCx: null,
    fitTargetCy: null,
    lastFitScope: null,
    lastScope: null,
    normalBodyRadius: null,
    normalTargetBodyRadius: null,
    displayBodyRadius: null,
    displayTargetBodyRadius: null,
};
const _selectedPreviewZoom = {
    level: 1.0,
    target: 1.0,
    animationId: 0,
    initialized: false,
    lockedToFit: false,
    fitRadius: null,
    fitCx: null,
    fitCy: null,
    fitTargetRadius: null,
    fitTargetCx: null,
    fitTargetCy: null,
    lastFitScope: null,
    lastScope: null,
    normalBodyRadius: null,
    normalTargetBodyRadius: null,
    displayBodyRadius: null,
    displayTargetBodyRadius: null,
};
const PREVIEW_MIN_LIGHT = 0.38;
const PREVIEW_LAYER_MIN = 1;
const PREVIEW_LAYER_MAX = 3;
const PREVIEW_LAYER_DEFAULT = 3;
const DEFAULT_MEMBRANE_OPACITY = 0.095;
const MAX_FORCE_ARROW = 58;
const FORCE_ARROW_HIT_RADIUS = 10;
const FORCES_CELL_FILL = "#555a6a";
const FORCES_CELL_STROKE = "#7a8290";
const FORCES_CELL_STROKE_WIDTH = 2;
const FORCES_CELL_SHADOW_ALPHA = 0.18;
const LIGHT_ARROW_COUNT = 8;
const LIGHT_ARROW_TIP_GAP = 14.0;
const LIGHT_ARROW_PARALLEL_SPACING = 9.0;
const LIGHT_ARROW_MIN_LENGTH = 16.0;
const LIGHT_ARROW_MAX_LENGTH = 42.0;
const LIGHT_ARROW_LINE_WIDTH = 1.35;
const LIGHT_ARROW_ACTIVE_LINE_WIDTH = 1.72;
const LIGHT_ARROW_MIN_VISIBLE_LIGHT = 0.001;
const LIGHT_DIRECTION_BLUR_POWER = 0.72;
const ENERGY_COLOR_RATE_SCALE = 0.50;
const ENERGY_COLOR_DEAD_ZONE = 0.004;
const PREVIEW_EMPTY_LYSOSOME_RADIUS_FACTOR = 0.112;
const PREVIEW_LYSOSOME_AREA_FACTOR = 4.7;
const PREVIEW_CYTOSOL_TEXTURE = Object.freeze({
    granules: 14,
    alpha: 0.060,
});
const PREVIEW_BASE_CYTOSOL_COLOR = Object.freeze({r: 238, g: 240, b: 232, opacity: 0.36});
const PREVIEW_ORGANIC_BROWN_COLOR = Object.freeze({h: 22, s: 43, l: 33});

const DEFAULT_ARROW_COLORS = Object.freeze({
    gravity: "#f87171",
    buoyancy: "#4ade80",
    drag: "#fbbf24",
    rotationalDrag: "#fbbf24",
    impulse: "#2563eb",
    speed: "#e2e8f0",
    angularVelocity: "#e2e8f0",
    light: "#67e8f9",
    flagellumTorque: "#f97316",
    totalForce: "#f8fafc",
    totalRotationalTorque: "#fb7185",
});

let _forceViewEnabled = false;
let _createPreviewCursor = null;
let _selectedHover = null;
let _createHover = null;
let _selectedHitTargets = [];
let _createHitTargets = [];
let _tooltipEl = null;
let _selectedPreviewRaf = 0;
let _createPreviewRaf = 0;
let _lastSelectedHoverKey = "";
let _lastCreateHoverKey = "";
let _selectedScopeHighlight = null;
let _createScopeHighlight = null;
let _lastSelectedScopeForHighlight = "general";
let _lastCreateScopeForHighlight = "general";
let _previewAnimationLoopId = 0;
let _previewAnimationLoopActive = false;
let _previewAnimationClockStartMs = 0;
let _previewAnimationFrameSeconds = 0;


export function setPreviewLayerCount(count) {
    state.previewLayerCount = _previewLayerCount(count);
}

export function selectedPreviewLayerCount() {
    return _previewLayerCount(state.previewLayerCount ?? PREVIEW_LAYER_DEFAULT);
}

function _previewLayerCount(count) {
    return Math.max(PREVIEW_LAYER_MIN, Math.min(PREVIEW_LAYER_MAX, Math.round(Number(count) || PREVIEW_LAYER_DEFAULT)));
}

export function setSelectedPreviewMode(mode) {
    const value = String(mode || "general").toLowerCase();
    state.selectedPreviewMode = ["general", "forces", "health", "energy"].includes(value) ? value : "general";
    _forceViewEnabled = state.selectedPreviewMode === "forces";
    _updatePreviewLayout();
}




export function markSelectedPreviewScopeSelected(scope) {
    _markPreviewScopeSelected("selected", scope);
}


export function markCreatePreviewScopeSelected(scope) {
    _markPreviewScopeSelected("create", scope);
}

export function syncCreatePreviewScopeSelectionWithoutFade(scope) {
    _syncPreviewScopeSelectionWithoutFade("create", scope);
}

export function handleSelectedPreviewPointerMove(event) {
    _handlePreviewPointer("selected", event);
}

export function handleCreatePreviewPointerMove(event) {
    _handlePreviewPointer("create", event);
}

export function handleSelectedPreviewPointerLeave() {
    _selectedHover = null;
    _lastSelectedHoverKey = "";
    _hideTooltip();
    _requestPreviewDraw("selected");
}

export function handleCreatePreviewPointerLeave() {
    _createHover = null;
    _lastCreateHoverKey = "";
    _hideTooltip();
    _requestPreviewDraw("create");
}

export function handleSelectedPreviewClick(event) {
    const hit = _hitAt("selected", event);
    if (hit?.kind === "organelle") {
        _selectedHover = hit;
        _lastSelectedHoverKey = _targetKey(hit);
        setSelectedInfoScope(hit.id);
        _syncPreviewScopeSelectionWithoutFade("selected", hit.id);
        window.dispatchEvent(new CustomEvent("biolab:selected-info-scope-change"));
    } else if (!hit) {
        setSelectedInfoScope("general");
        _syncPreviewScopeSelectionWithoutFade("selected", "general");
        window.dispatchEvent(new CustomEvent("biolab:selected-info-scope-change"));
    }
}

export function handleCreatePreviewClick(event) {
    const hit = _hitAt("create", event);
    if (hit?.kind === "organelle") {
        _createHover = hit;
        _lastCreateHoverKey = _targetKey(hit);
        setCreateInfoScope(hit.id);
        window.dispatchEvent(new CustomEvent("biolab:create-info-scope-change", {
            detail: {scope: hit.id, source: "preview", fadeHighlight: false}
        }));
    } else if (!hit) {
        setCreateInfoScope("general");
        window.dispatchEvent(new CustomEvent("biolab:create-info-scope-change", {
            detail: {scope: "general", source: "preview", fadeHighlight: false}
        }));
    }
}

function _handlePreviewPointer(kind, event) {
    const canvas = kind === "selected" ? dom.selectedCellPreviewCanvas : dom.createCellPreviewCanvas;
    if (!canvas) return;
    const point = _canvasPoint(canvas, event);
    const layout = kind === "selected"
        ? _currentSelectedPreviewLayout(_previewLogicalWidth(canvas), _previewLogicalHeight(canvas), state.cellById?.get?.(state.selectedCellId))
        : _currentCreatePreviewLayout(_previewLogicalWidth(canvas), _previewLogicalHeight(canvas));
    const center = {x: layout.cx, y: layout.cy};
    const dist = Math.hypot(point.x - center.x, point.y - center.y);

    let cursorChanged = false;
    // Cursor-light exists only in Cell Creation. It freezes when the cursor
    // leaves preview or enters the cell, because neither handler overwrites
    // the last valid point in those states.
    if (kind === "create" && dist > _currentCreatePreviewBodyRadius(canvas)) {
        cursorChanged = !_createPreviewCursor
            || Math.hypot(point.x - _createPreviewCursor.x, point.y - _createPreviewCursor.y) > 0.5;
        _createPreviewCursor = point;
    }

    const hit = _hitFromTargets(kind === "selected" ? _selectedHitTargets : _createHitTargets, point);
    const key = _targetKey(hit);
    const hoverChanged = kind === "selected" ? key !== _lastSelectedHoverKey : key !== _lastCreateHoverKey;

    if (kind === "selected") {
        _selectedHover = hit;
        _lastSelectedHoverKey = key;
    } else {
        _createHover = hit;
        _lastCreateHoverKey = key;
    }

    if (hit) _showTooltip(event.clientX, event.clientY, hit.tooltip ?? hit.label ?? hit.id);
    else _hideTooltip();

    if (hoverChanged || cursorChanged) {
        _requestPreviewDraw(kind);
    }
}

function _markPreviewScopeSelected(kind, scope) {
    const normalized = String(scope ?? "general").toLowerCase();
    const value = normalized === "nucleoid" ? "nucleus" : normalized;
    if (kind === "selected") {
        _lastSelectedScopeForHighlight = value;
        _selectedScopeHighlight = value === "general" ? null : {id: value, start: performance.now()};
    } else {
        _lastCreateScopeForHighlight = value;
        _createScopeHighlight = value === "general" ? null : {id: value, start: performance.now()};
    }
}

function _syncPreviewScopeSelectionWithoutFade(kind, scope) {
    const normalized = String(scope ?? "general").toLowerCase();
    const value = normalized === "nucleoid" ? "nucleus" : normalized;
    if (kind === "selected") {
        _lastSelectedScopeForHighlight = value;
        _selectedScopeHighlight = null;
    } else {
        _lastCreateScopeForHighlight = value;
        _createScopeHighlight = null;
    }
}

function _previewScopeHighlightAlpha(kind, activeScope, hoverOrganelle) {
    const normalized = String(activeScope ?? "general").toLowerCase();
    const scope = normalized === "nucleoid" ? "nucleus" : normalized;
    const lastKey = kind === "selected" ? _lastSelectedScopeForHighlight : _lastCreateScopeForHighlight;
    const highlight = kind === "selected" ? _selectedScopeHighlight : _createScopeHighlight;

    if (scope !== lastKey) {
        _syncPreviewScopeSelectionWithoutFade(kind, scope);
        return 0.0;
    }

    if (scope === "general") return 0.0;
    if (hoverOrganelle === scope || (scope === "nucleus" && hoverOrganelle === "nucleoid")) return 1.0;
    if (!highlight || highlight.id !== scope) return 0.0;

    const age = Math.max(0.0, performance.now() - highlight.start);
    const t = _clamp01(age / 1000.0);
    const fade = t * t * (3.0 - 2.0 * t);
    return 1.0 - fade;
}

function _targetKey(hit) {
    if (!hit) return "";
    return `${hit.kind ?? hit.type}:${hit.id ?? ""}:${hit.index ?? ""}`;
}

function _requestPreviewDraw(kind) {
    if (kind === "selected") {
        if (_selectedPreviewRaf) return;
        _selectedPreviewRaf = requestAnimationFrame(() => {
            _selectedPreviewRaf = 0;
            const cell = state.cellById?.get(state.selectedCellId);
            if (cell) drawSelectedCellPreview(cell, state.selectedStrain);
        });
        return;
    }

    if (_createPreviewRaf) return;
    _createPreviewRaf = requestAnimationFrame(() => {
        _createPreviewRaf = 0;
        drawCreateCellPreview();
    });
}

function _hitAt(kind, event) {
    const canvas = kind === "selected" ? dom.selectedCellPreviewCanvas : dom.createCellPreviewCanvas;
    if (!canvas) return null;
    return _hitFromTargets(kind === "selected" ? _selectedHitTargets : _createHitTargets, _canvasPoint(canvas, event));
}

function _canvasPoint(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
}

function _previewLogicalWidth(canvas) {
    return Math.max(1, Number(canvas?.dataset?.logicalWidth) || canvas?.clientWidth || canvas?.width || 1);
}

function _previewLogicalHeight(canvas) {
    return Math.max(1, Number(canvas?.dataset?.logicalHeight) || canvas?.clientHeight || canvas?.height || 1);
}

function _previewRenderScale(ctx) {
    const canvas = ctx?.canvas;
    return Math.max(1, Number(canvas?.dataset?.previewDpr) || window.devicePixelRatio || 1);
}

function _hitFromTargets(targets, point) {
    for (let i = targets.length - 1; i >= 0; i--) {
        const target = targets[i];
        if (target.type === "circle") {
            const d = Math.hypot(point.x - target.x, point.y - target.y);
            if (d <= target.radius) return target;
        } else if (target.type === "ring") {
            const d = Math.hypot(point.x - target.x, point.y - target.y);
            if (d >= target.inner && d <= target.outer) return target;
        } else if (target.type === "segment") {
            if (_distanceToSegment(point.x, point.y, target.x1, target.y1, target.x2, target.y2) <= (target.hitRadius ?? FORCE_ARROW_HIT_RADIUS)) return target;
        }
    }
    return null;
}

function _distanceToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq <= 0.000001) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function _showTooltip(clientX, clientY, text) {
    if (!_tooltipEl) {
        _tooltipEl = document.createElement("div");
        _tooltipEl.className = "preview-canvas-tooltip";
        document.body.appendChild(_tooltipEl);
    }
    const html = String(text ?? "");
    if (_tooltipEl.innerHTML !== html) {
        _tooltipEl.innerHTML = html;
    }
    _tooltipEl.style.left = `${clientX}px`;
    _tooltipEl.style.top = `${clientY - 8}px`;
    _tooltipEl.classList.add("visible");
}

function _hideTooltip() {
    if (!_tooltipEl) return;
    _tooltipEl.classList.remove("visible");
}

function _previewModeLabel(mode) {
    const labels = {
        general: "General",
        forces: "Forces",
        health: "Health",
        energy: "Energy",
    };
    return labels[String(mode ?? "general").toLowerCase()] ?? _cap(String(mode ?? "general"));
}

function _updatePreviewLayout() {
    const mode = state.selectedPreviewMode ?? "general";
    const layerControls = dom.previewLayerControls;
    layerControls?.classList.toggle("preview-layer-controls--hidden", mode !== "general");

    const controls = dom.selectedPreviewModeControls;
    if (controls) {
        controls.dataset.mode = mode;
        for (const button of controls.querySelectorAll("[data-preview-mode]")) {
            const active = button.dataset.previewMode === mode;
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
        }
    }

    const badge = dom.forceViewIndicator;
    if (badge) {
        badge.classList.remove("preview-mode-badge--general", "preview-mode-badge--forces", "preview-mode-badge--health", "preview-mode-badge--energy", "preview-mode-badge--normal");
        badge.classList.add(`preview-mode-badge--${mode}`);
        const text = badge.querySelector(".preview-mode-badge-text");
        if (text) text.textContent = t(_previewModeLabel(mode));
    }
}

function _selectedPreviewRadius() {
    return state.selectedPreviewMode === "forces" ? PREVIEW_RADIUS : PREVIEW_RADIUS_EXPANDED;
}

export function drawSelectedCellPreview(worldCell, strain) {
    const prepared = preparePreviewCanvas(dom.selectedCellPreviewCtx, dom.selectedCellPreviewCanvas);
    if (!prepared) return;
    _selectedHitTargets = [];

    const {width, height} = prepared;
    let cx = width / 2;
    let cy = height / 2;

    if (!worldCell) {
        _syncSelectedPreviewNoticeIndicator(null);
        return;
    }

    const mode = state.selectedPreviewMode ?? "general";
    const visual = worldCell?.visual ?? _previewVisualFromGenome(strain?.genome ?? worldCell?.genome ?? {});
    _syncSelectedPreviewZoomAuto(width, height, worldCell);
    const previewLayout = _currentSelectedPreviewLayout(width, height, worldCell);
    cx = previewLayout.cx;
    cy = previewLayout.cy;
    const previewRadius = previewLayout.radius;

    if (mode === "forces") {
        _drawForcesMode(dom.selectedCellPreviewCtx, worldCell, visual, cx, cy);
    } else if (mode === "health") {
        _drawHealthMode(dom.selectedCellPreviewCtx, worldCell, visual, cx, cy, previewRadius, _selectedHitTargets, _selectedHover);
    } else if (mode === "energy") {
        _drawEnergyMode(dom.selectedCellPreviewCtx, worldCell, visual, cx, cy, previewRadius, _selectedHitTargets, _selectedHover);
    } else {
        _drawGeneralMode(dom.selectedCellPreviewCtx, worldCell, visual, cx, cy, previewRadius, selectedPreviewLayerCount(), null, _selectedHitTargets, _selectedHover);
    }

    if (worldCell?.dead) {
        _applyDeadPreviewTint(dom.selectedCellPreviewCtx, cx, cy, previewRadius);
    }

    _syncSelectedPreviewNoticeIndicator(worldCell);
    _ensurePreviewAnimationLoop();
}

function _drawGeneralMode(ctx, worldCell, visual, cx, cy, radius, layers, cursorLight, hitTargets, hover) {
    _drawPreviewBiologyCell(ctx, cx, cy, radius, visual, worldCell, layers, cursorLight, hitTargets, hover, "general");
}

function _drawHealthMode(ctx, cell, visual, cx, cy, radius, hitTargets, hover) {
    const cellDamage = _clamp01(cell.cellDamage ?? 0);
    const healthVisual = {
        ...visual,
        cellColor: _healthColor(visual.cellColor, cellDamage),
        cytosolColor: _healthColor(visual.cytosolColor ?? visual.cellColor, cellDamage),
        membraneColor: _healthColor(visual.membraneColor, _clamp01(cell.membraneDamage ?? cellDamage)),
        nucleoidColor: _healthColor(visual.nucleoidColor, _clamp01(cell.nucleusDamage ?? cellDamage)),
        chloroplastColor: _healthColor(visual.chloroplastColor, _clamp01(cell.cpDamage ?? 0)),
        lysosomeColor: _healthColor(visual.lysosomeColor, _organelleHealthDamage(cell, "lysosome")),
        flagellumColor: _healthColor(visual.flagellumColor, _organelleHealthDamage(cell, "flagellum")),
    };
    _drawPreviewBiologyCell(ctx, cx, cy, radius, healthVisual, cell, 3, null, hitTargets, hover, "health");
}

function _drawEnergyMode(ctx, cell, visual, cx, cy, radius, hitTargets, hover) {
    const energyVisual = {
        ...visual,
        cellColor: _energyColor(visual.cellColor, _energyBalanceFor(cell, "cytosol")),
        cytosolColor: _energyColor(visual.cytosolColor ?? visual.cellColor, _energyBalanceFor(cell, "cytosol")),
        membraneColor: _energyColor(visual.membraneColor, _energyBalanceFor(cell, "membrane")),
        nucleoidColor: _energyColor(visual.nucleoidColor, _energyBalanceFor(cell, "nucleus")),
        chloroplastColor: _energyColor(visual.chloroplastColor, _energyBalanceFor(cell, "chloroplast")),
        lysosomeColor: _energyColor(visual.lysosomeColor, _energyBalanceFor(cell, "lysosome")),
        flagellumColor: _energyColor(visual.flagellumColor, _energyBalanceFor(cell, "flagellum")),
    };
    _drawPreviewBiologyCell(ctx, cx, cy, radius, energyVisual, cell, 3, null, hitTargets, hover, "energy");
}

function _modeVisual(visual, map) {
    return {
        ...visual,
        cellColor: map(visual.cellColor),
        cytosolColor: map(visual.cytosolColor ?? visual.cellColor),
        membraneColor: map(visual.membraneColor),
        nucleoidColor: map(visual.nucleoidColor),
        chloroplastColor: map(visual.chloroplastColor),
        lysosomeColor: map(visual.lysosomeColor),
        flagellumColor: map(visual.flagellumColor),
    };
}

function _diagnosticMonochromeVisual(visual) {
    return _modeVisual(visual, _gray);
}

function _brightGrayscaleColor(color) {
    return _gray(color);
}

function _healthColor(color, damage) {
    const g = _gray(color);
    const loss = _clamp01(damage);
    return {
        r: Math.round(g.r + (235 - g.r) * loss),
        g: Math.round(g.g * (1 - loss * 0.82)),
        b: Math.round(g.b * (1 - loss * 0.88)),
        opacity: color?.opacity ?? 1,
    };
}

function _energyColor(color, net) {
    const g = _gray(color);
    const t = Math.min(1, Math.abs(net));
    const target = net >= 0 ? {r: 40, g: 210, b: 104} : {r: 168, g: 85, b: 247};
    return {..._mixRgb(g, target, t), opacity: color?.opacity ?? 1};
}

function _gray(color) {
    const y = Math.round((color?.r ?? 255) * 0.299 + (color?.g ?? 255) * 0.587 + (color?.b ?? 255) * 0.114);
    return {r: y, g: y, b: y, opacity: color?.opacity ?? 1};
}

function _damagePerformance(damage) {
    return _clamp01(Math.exp(-Math.max(0, Number(damage) || 0)));
}

function _organelleHealthPerformance(cell, scope) {
    const damage = _organelleHealthDamage(cell, scope);
    return _clamp01(1.0 - damage);
}

function _organelleHealthDamage(cell, scope) {
    const slots = _multiOrganelleSlots(cell, scope);
    if (slots.length > 0) {
        const values = slots.map(slot => Number(slot.damage ?? 0)).filter(Number.isFinite);
        if (values.length > 0) return _clamp01(values.reduce((sum, value) => sum + _clamp01(value), 0) / values.length);
    }
    if (scope === "flagellum") return _clamp01(Math.max(0, Number(cell?.flagellumDamage ?? 0) || 0));
    if (scope === "lysosome") return _clamp01(Math.max(0, Number(cell?.lysosomeDamage ?? 0) || 0));
    return _clamp01(Math.max(0, Number(cell?.cellDamage ?? 0) || 0));
}

function _multiOrganelleSlots(cell, scope) {
    if (scope === "flagellum") return Array.isArray(cell?.flagellumSlots) ? cell.flagellumSlots : [];
    if (scope === "lysosome") return _lysosomeSlots(cell);
    return [];
}

function _singleOrganelleDamage(cell, id) {
    if (id === "chloroplast") return cell?.cpDamage ?? 0;
    if (id === "membrane") return cell?.membraneDamage ?? 0;
    if (id === "flagellum") return cell?.flagellumDamage ?? 0;
    if (id === "lysosome") return cell?.lysosomeDamage ?? 0;
    return cell?.cellDamage ?? 0;
}

function _singleOrganelleDamageRate(cell, id) {
    if (id === "chloroplast") return cell?.cpPhotoDamageRate ?? 0;
    if (id === "membrane") return cell?.membraneDamageRate ?? 0;
    if (id === "flagellum") return cell?.flagellumDamageRate ?? 0;
    if (id === "lysosome") return cell?.lysosomeDamageRate ?? 0;
    return cell?.cellDamageRate ?? 0;
}

function _singleOrganelleRepairRate(cell, id) {
    if (id === "chloroplast") return cell?.cpRepairRate ?? 0;
    if (id === "membrane") return cell?.membraneRepairRate ?? 0;
    if (id === "flagellum") return cell?.flagellumRepairRate ?? 0;
    if (id === "lysosome") return cell?.lysosomeRepairRate ?? 0;
    return cell?.cellRepairRate ?? 0;
}

function _energyBalanceFor(cell, scope) {
    const production = Math.max(0, Number(energyProductionFor(cell, scope)) || 0);
    const consumption = Math.max(0, Number(energyConsumptionFor(cell, scope)) || 0);
    const net = production - consumption;
    if (Math.abs(net) <= ENERGY_COLOR_DEAD_ZONE) {
        return 0.0;
    }

    // Keep Energy preview predictable: an organelle color depends only on that
    // organelle's own net rate. Food digestion must not rescale unrelated
    // consuming organelles through a whole-cell production/consumption balance.
    return Math.max(-1, Math.min(1, net / ENERGY_COLOR_RATE_SCALE));
}

function _drawPreviewBiologyCell(
    ctx,
    cx,
    cy,
    radius,
    visual,
    worldCell = null,
    layerCount = PREVIEW_LAYER_DEFAULT,
    cursorLight = null,
    hitTargets = [],
    hover = null,
    mode = "general"
) {
    const normalizedMode = String(mode ?? "general").toLowerCase();
    const layers = normalizedMode === "health" || normalizedMode === "energy" ? 3 : _previewLayerCount(layerCount);
    const previewKind = worldCell ? "selected" : "create";
    const activeScope = _activePreviewScope(worldCell);
    const hoverOrganelle = hover?.kind === "organelle" ? hover.id : null;
    const selectedHighlightAlpha = _previewScopeHighlightAlpha(previewKind, activeScope, hoverOrganelle);
    const activeOrganelle = hoverOrganelle ?? (selectedHighlightAlpha > 0.001 ? activeScope : "general");
    const activeOrganelleAlpha = hoverOrganelle ? 1.0 : selectedHighlightAlpha;

    if (!hoverOrganelle && activeScope !== "general" && selectedHighlightAlpha > 0.001) {
        _requestPreviewDraw(previewKind);
    }

    const renderCell = worldCell ?? {
        id: -1,
        x: cx,
        y: cy,
        radius,
        visual,
        genome: state.cellDraft?.genome ?? {},
        startFlagellumDamage: state.cellDraft?.startFlagellumDamage ?? 0,
        localLight: 1.0,
    };

    drawBiologyCell(ctx, renderCell, {
        x: cx,
        y: cy,
        radius,
        sourceRadius: Number(worldCell?.radius) > 0 ? Number(worldCell.radius) : radius,
        visual,
        layerCount: layers,
        mode: normalizedMode,
        preview: true,
        cursorLight,
        capturedFoods: state.world?.foods ?? null,
        hitTargets,
        activeOrganelle,
        activeOrganelleAlpha,
        labelFor: id => id === "nucleus" || id === "nucleoid" ? t("Nucleus") : t(_cap(id)),
        tooltipFor: id => _organelleTooltip(id, worldCell),
        renderScale: _previewRenderScale(ctx),
        animationTime: _previewAnimationSeconds(),
    });
}
function _drawOrganellesOnlyCellOutline(ctx, cx, cy, radius) {
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(241,245,249,0.82)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function _drawCytosolHoverFill(ctx, cx, cy, radius, alpha = 1.0) {
    const a = _clamp01(alpha);
    if (a <= 0.001) return;
    ctx.save();
    _fillHatchCircle(ctx, cx, cy, radius, `rgba(255,255,255,${(0.24 * a).toFixed(3)})`);
    ctx.restore();
}

function _drawCytosolHoverOutline(ctx, cx, cy, radius, alpha = 1.0) {
    const a = _clamp01(alpha);
    if (a <= 0.001) return;
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = `rgba(255,255,255,${(0.86 * a).toFixed(3)})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function _drawMembraneHoverFill(ctx, cx, cy, radius, alpha = 1.0) {
    const a = _clamp01(alpha);
    if (a <= 0.001) return;
    ctx.save();
    _fillHatchCircleWithRadialFade(ctx, cx, cy, radius, a);
    ctx.restore();
}

function _drawMembraneHoverOutline(ctx, cx, cy, radius, alpha = 1.0) {
    const a = _clamp01(alpha);
    if (a <= 0.001) return;
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = `rgba(255,255,255,${(0.80 * a).toFixed(3)})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function _drawOrganelleHover(ctx, cx, cy, radius, id) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.lineWidth = 1.35;
    ctx.setLineDash([4, 3]);

    if (id === "membrane") {
        _fillHatchCircleWithRadialFade(ctx, cx, cy, radius, 0.72);
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
    } else if (id === "cytosol") {
        _fillHatchCircle(ctx, cx, cy, radius * 0.78, "rgba(255,255,255,0.16)");
        ctx.beginPath(); ctx.arc(cx, cy, radius * 0.78, 0, Math.PI * 2); ctx.stroke();
    } else if (id === "nucleus" || id === "nucleoid") {
        ctx.beginPath(); ctx.arc(cx, cy, radius * 0.28 + 2, 0, Math.PI * 2); ctx.stroke();
    } else if (id === "chloroplast") {
        // All chloroplasts are highlighted inside _drawPreviewChloroplasts().
    } else if (id === "lysosome") {
        // All lysosomes are highlighted inside _drawPreviewLysosomes().
    }

    ctx.restore();
}


function _lysosomeSlots(cell) {
    return Array.isArray(cell?.lysosomeSlots) ? cell.lysosomeSlots : [];
}

function _range(values) {
    const finite = (values ?? []).map(Number).filter(Number.isFinite);
    if (!finite.length) return {min: 0, max: 0};
    return {min: Math.min(...finite), max: Math.max(...finite)};
}

function _rangeFmt(range) {
    return `${_fmt(range.min)} ~ ${_fmt(range.max)}`;
}

function _rangePct(range) {
    return `${_pct(range.min)} ~ ${_pct(range.max)}`;
}
function _organelleTooltip(id, cell) {
    const name = id === "nucleus" || id === "nucleoid" ? t("Nucleus") : t(_cap(id));
    const title = `<div class="preview-tooltip-title">${name}</div>`;
    if (!cell) return title;

    if (state.selectedPreviewMode === "energy") {
        return `${title}<div>${t("Production: {value}", { value: formatOrganelleEnergy(cell, id, "production", _fmt) })}</div><div>${t("Consumption: {value}", { value: formatOrganelleEnergy(cell, id, "consumption", _fmt) })}</div>`;
    }

    if (state.selectedPreviewMode === "health") {
        const slots = _multiOrganelleSlots(cell, id);
        if (slots.length > 0) {
            const perfRange = _range(slots.map(slot => Number(slot.performance ?? _damagePerformance(slot.damage))));
            const damageRange = _range(slots.map(slot => Number(slot.damage ?? 0)));
            const damageRateRange = _range(slots.map(slot => Number(slot.damageRate ?? 0)));
            const repairRateRange = _range(slots.map(slot => Number(slot.repairRate ?? 0)));
            return `${title}<div>${t("Performance: {value}", { value: _rangePct(perfRange) })}</div><div>${t("Damage: {value}", { value: _rangeFmt(damageRange) })}</div><div>${t("Damage rate: {value}", { value: _rangeFmt(damageRateRange) })}</div><div>${t("Repair rate: {value}", { value: _rangeFmt(repairRateRange) })}</div>`;
        }
        const damage = _singleOrganelleDamage(cell, id);
        const rate = _singleOrganelleDamageRate(cell, id);
        const repair = _singleOrganelleRepairRate(cell, id);
        return `${title}<div>${t("Performance: {value}", { value: _pct(_damagePerformance(damage)) })}</div><div>${t("Damage: {value}", { value: _fmt(damage) })}</div><div>${t("Damage rate: {value}", { value: _fmt(rate) })}</div><div>${t("Repair rate: {value}", { value: _fmt(repair) })}</div>`;
    }

    return title;
}

function _drawPreviewNucleoid(ctx, cx, cy, radius, color, opacity, worldCell, hitTargets, hover, visual = null, mode = "general") {
    const worldRadius = Number(worldCell?.radius ?? 0);
    const scale = worldRadius > 0 ? radius / worldRadius : 1.0;
    const r = Math.max(0.0, Number(worldCell?.nucleusRadius ?? 0) > 0 ? Number(worldCell.nucleusRadius) * scale : radius * 0.28);
    const nx = cx + (Number(worldCell?.nucleusOffsetX ?? 0) || 0) * scale;
    const ny = cy + (Number(worldCell?.nucleusOffsetY ?? 0) || 0) * scale;
    const active = hover?.id === "nucleus" || hover?.id === "nucleoid";
    const highlightAlpha = active ? _clamp01(hover?.alpha ?? 1.0) : 0.0;
    const alpha = _clamp01(opacity) * (active ? 1.0 : 0.92);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = _rgba(color ?? {r:82,g:72,b:150}, 1);
    ctx.beginPath();
    ctx.arc(nx, ny, r, 0, Math.PI * 2);
    ctx.fill();
    if (String(mode ?? "general").toLowerCase() === "general") {
        _drawPreviewOrganelleExternalShadow(ctx, nx, ny, r, visual ?? worldCell?.visual, alpha);
    }
    if (active && highlightAlpha > 0.001) {
        ctx.globalAlpha = 1.0;
        _fillHatchCircleDown(ctx, nx, ny, r, `rgba(255,255,255,${(0.20 * highlightAlpha).toFixed(3)})`);
        ctx.strokeStyle = `rgba(255,255,255,${(0.90 * highlightAlpha).toFixed(3)})`;
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
    hitTargets?.push({type: "circle", kind: "organelle", id: "nucleus", label: t("Nucleus"), tooltip: _organelleTooltip("nucleus", worldCell), x: nx, y: ny, radius: r + 4});
}

function _drawPreviewChloroplasts(ctx, cx, cy, radius, color, opacity, amount, worldCell = null, hitTargets = [], hover = null, cellRotation = 0, mode = "general") {
    const count = Math.max(0, Math.round(amount ?? 0));
    const visibleCount = Math.min(count, 24);
    if (visibleCount <= 0 || opacity <= 0.001) return;
    const seed = Number(worldCell?.id ?? count * 97 + 17) || 1;
    const organelleRadius = Math.max(1.35, radius * 0.11);
    const fillColor = color ?? {r:170,g:174,b:126};
    const active = hover?.kind === "organelle" && hover?.id === "chloroplast";
    const highlightAlpha = active ? _clamp01(hover?.alpha ?? 1.0) : 0.0;
    ctx.save();
    ctx.fillStyle = _rgba(fillColor, opacity);
    ctx.strokeStyle = _rgba(_darkenRgb(fillColor, 34), opacity * 0.55);
    ctx.lineWidth = 0.55;
    for (let i = 0; i < visibleCount; i++) {
        const layout = _chloroplastLayout(seed, i, radius, cellRotation, visibleCount);
        const x = cx + layout.x;
        const y = cy + layout.y;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(layout.rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, organelleRadius * 1.34, organelleRadius * layout.normalScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (active && highlightAlpha > 0.001) {
            _fillHatchEllipseDown(ctx, 0, 0, organelleRadius * 1.34, organelleRadius * layout.normalScale, 0, `rgba(255,255,255,${(0.18 * highlightAlpha).toFixed(3)})`);
            ctx.strokeStyle = `rgba(255,255,255,${(0.90 * highlightAlpha).toFixed(3)})`;
            ctx.lineWidth = 1.15;
            ctx.beginPath();
            ctx.ellipse(0, 0, organelleRadius * 1.34, organelleRadius * layout.normalScale, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
        hitTargets?.push({type: "circle", kind: "organelle", id: "chloroplast", index: i, label: t("Chloroplast"), tooltip: _organelleTooltip("chloroplast", worldCell), x, y, radius: organelleRadius * 1.34});
    }
    ctx.restore();
}

function _chloroplastLayout(seed, i, radius, cellRotation = 0, count = 1) {
    const visibleCount = Math.max(1, Math.round(count ?? 1));
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const seedAngle = hash01(seed, 911) * Math.PI * 2;
    const density = Math.min(1.0, Math.max(0.0, (visibleCount - 1) / 23));
    const jitterScale = 1.0 - density * 0.48;
    const slotT = (i + 0.5) / visibleCount;
    const radialJitter = (hash01(seed, i * 4 + 2) - 0.5) * Math.min(0.42 / visibleCount, 0.055) * jitterScale;
    const radial01 = Math.sqrt(_clamp(slotT + radialJitter, 0.035, 0.965));
    const angleJitter = (hash01(seed, i * 4 + 1) - 0.5) * goldenAngle * Math.min(0.58, 1.25 / Math.sqrt(visibleCount)) * jitterScale;
    const angle = seedAngle + i * goldenAngle + angleJitter + cellRotation;
    const distance = radial01 * radius * 0.82;
    const edgeT = _smoothstep((radial01 - 0.66) / 0.24);
    return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotation: angle + Math.PI / 2 + (hash01(seed, i * 4 + 3) - 0.5) * 0.28,
        normalScale: 0.78 - edgeT * 0.34,
    };
}


function _hsla(h, s, l, a) {
    return `hsla(${h}, ${s}%, ${l}%, ${_clamp01(a).toFixed(3)})`;
}

function _lysosomeAcidColor(enzyme01) {
    const activity = _clamp01((_clamp01(enzyme01) - 0.15) / 0.85);
    const low = {r: 92, g: 28, b: 43};
    const mid = {r: 154, g: 34, b: 43};
    const high = {r: 232, g: 48, b: 37};
    if (activity < 0.5) return _mixRgb(low, mid, activity / 0.5);
    return _mixRgb(mid, high, (activity - 0.5) / 0.5);
}

function _drawPreviewLysosomes(ctx, cx, cy, radius, color, opacity, amount, glowColor, glowStrength, worldCell = null, hitTargets = [], hover = null, cellRotation = 0, mode = "general") {
    const count = Math.max(0, Math.round(amount ?? 0));
    const visibleCount = Math.min(count, 6);
    if (visibleCount <= 0 || opacity <= 0.001) return;
    const seed = Number(worldCell?.id ?? count * 131 + 23) || 1;
    const fillColor = color ?? {r:180,g:36,b:38};
    const active = hover?.kind === "organelle" && hover?.id === "lysosome";
    const highlightAlpha = active ? _clamp01(hover?.alpha ?? 1.0) : 0.0;
    const slots = _lysosomeSlots(worldCell);
    const slotIndex = buildSlotIndex(slots);
    const normalizedMode = String(mode ?? "general").toLowerCase();
    const drawCapturedFood = normalizedMode !== "health";
    const energyFoodColor = {r: 255, g: 218, b: 38};
    const foodColor = {h: 22, s: 43, l: 33};
    const foodInnerColor = {h: 22, s: 43, l: 42};

    const slotScale = Number(worldCell?.radius) > 0 ? radius / Number(worldCell.radius) : 1.0;
    let fallbackLayouts = null;

    ctx.save();
    for (let i = 0; i < visibleCount; i++) {
        const slot = slotIndex.get(i) ?? null;
        let layout = _lysosomeLayoutFromSlot(slot, slotScale);
        if (!layout) {
            if (!fallbackLayouts) {
                const scaledSlots = slots.map(slot => ({...slot, foodRadius: Math.max(0, Number(slot?.foodRadius ?? 0) || 0) * slotScale}));
                fallbackLayouts = _lysosomeLayouts(seed, visibleCount, radius, scaledSlots);
            }
            layout = fallbackLayouts[i];
        }
        layout ??= {x: 0, y: 0, r: Math.max(1.2, radius * 0.12), rotation: 0};
        const x = cx + layout.x;
        const y = cy + layout.y;
        const rawFoodRadius = Math.max(0, Number(slot?.foodRadius ?? 0) || 0);
        const foodRadius = rawFoodRadius * slotScale;
        const r = layout.r;

        if (normalizedMode === "general") {
            _fillPreviewLysosomeRadial(ctx, x, y, r, layout.rotation, fillColor, opacity * (active ? 1.0 : 0.88));
        } else {
            _fillPreviewEllipse(ctx, x, y, r * 1.05, r * 0.92, layout.rotation, fillColor, opacity * (active ? 1.0 : 0.88));
        }
        if (active && highlightAlpha > 0.001) {
            _fillHatchEllipseDown(ctx, x, y, r * 1.05, r * 0.92, layout.rotation, `rgba(255,255,255,${(0.18 * highlightAlpha).toFixed(3)})`);
            ctx.strokeStyle = `rgba(255,255,255,${(0.90 * highlightAlpha).toFixed(3)})`;
            ctx.lineWidth = 1.15;
        } else {
            ctx.strokeStyle = _rgba(_darkenRgb(fillColor, 26), opacity * 0.62);
            ctx.lineWidth = 0.55;
        }
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.05, r * 0.92, layout.rotation, 0, Math.PI * 2);
        ctx.stroke();

        if (drawCapturedFood && slot?.occupied && foodRadius > 0) {
            const captured = _capturedPreviewFoodForSlot(worldCell, i, cx, cy, radius, x, y, foodRadius);
            const fx = captured.x;
            const fy = captured.y;
            const fr = Math.max(0.45, captured.radius);
            const foodId = Number(slot.foodId ?? i);
            if (normalizedMode === "energy") {
                _fillPreviewFoodShape(ctx, foodId, fx, fy, fr, _rgba(energyFoodColor, 0.96), 1.0);
            } else {
                _fillPreviewFoodShape(ctx, foodId, fx, fy, fr, _hsla(foodColor.h, foodColor.s, foodColor.l, 0.92), 1.0);
                _fillPreviewFoodShape(ctx, foodId, fx, fy, fr, _hsla(foodInnerColor.h, foodInnerColor.s, foodInnerColor.l, 0.88), 0.52);
            }

        }

        hitTargets?.push({type: "circle", kind: "organelle", id: "lysosome", index: i, label: t("Lysosome"), tooltip: _organelleTooltip("lysosome", worldCell), x, y, radius: r * 1.8});
    }
    ctx.restore();
}


function _lysosomeLayoutFromSlot(slot, scale = 1.0) {
    const r = Number(slot?.layoutRadius ?? 0);
    const x = Number(slot?.layoutX ?? NaN);
    const y = Number(slot?.layoutY ?? NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r) || r <= 0) return null;
    return {
        x: x * scale,
        y: y * scale,
        r: r * scale,
        rotation: Number(slot?.layoutRotation ?? 0) || 0,
    };
}

function _capturedPreviewFoodForSlot(worldCell, slotIndex, cx, cy, previewRadius, fallbackX, fallbackY, fallbackRadius = 0) {
    const cellId = Number(worldCell?.id);
    const food = (state.world?.foods ?? []).find(item =>
        Number(item?.capturedByCellId) === cellId
        && Math.round(Number(item?.digestionSlotIndex)) === slotIndex
    );

    if (!food || !Number.isFinite(Number(worldCell?.radius)) || Number(worldCell.radius) <= 0) {
        return {x: fallbackX, y: fallbackY, radius: Math.max(0, Number(fallbackRadius) || 0)};
    }

    const scale = previewRadius / Number(worldCell.radius);
    return {
        x: cx + (Number(food.x) - Number(worldCell.x)) * scale,
        y: cy + (Number(food.y) - Number(worldCell.y)) * scale,
        radius: Math.max(0, Number(food.radius) * scale),
    };
}

function _lysosomeLayouts(seed, count, radius, slots = []) {
    return radialOrganelleLayouts(
        seed,
        count,
        radius,
        slots,
        (cellRadius, slot) => {
            const base = Math.max(
                Math.sqrt(PREVIEW_LYSOSOME_AREA_FACTOR / Math.PI),
                cellRadius * PREVIEW_EMPTY_LYSOSOME_RADIUS_FACTOR
            );
            const foodRadius = Number(slot?.foodRadius ?? slot?.targetFoodRadius ?? 0) || 0;
            const stretched = foodRadius > 0 ? foodRadius * 1.22 : base;
            return Math.max(Math.max(1.8, cellRadius * 0.055), Math.max(base, stretched));
        }
    );
}

function _drawPreviewCytosolTexture(ctx, cx, cy, radius, color, alpha) {
    const a = _clamp01(alpha) * PREVIEW_CYTOSOL_TEXTURE.alpha;
    if (a <= 0.001) return;
    const c = color ?? {r: 238, g: 240, b: 232};
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.96, 0, Math.PI * 2);
    ctx.clip();
    for (let i = 0; i < PREVIEW_CYTOSOL_TEXTURE.granules; i++) {
        const angle = hash01(811, i * 2 + 1) * Math.PI * 2;
        const radial = Math.sqrt(hash01(811, i * 2 + 2)) * radius * 0.82;
        const x = cx + Math.cos(angle) * radial;
        const y = cy + Math.sin(angle) * radial;
        const r = Math.max(0.35, radius * (0.004 + 0.010 * hash01(811, i * 3 + 5)));
        ctx.fillStyle = _rgba({r: Math.min(255, c.r + 18), g: Math.min(255, c.g + 18), b: Math.min(255, c.b + 18)}, a * (0.65 + 0.35 * hash01(811, i * 5 + 7)));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function _fillPreviewLysosomeRadial(ctx, x, y, radius, rotation, color, alpha) {
    const a = _clamp01(alpha);
    if (a <= 0.001) return;
    const center = color ?? {r: 180, g: 36, b: 38};
    const midEdge = _darkenRgb(center, 16);
    const edge = _darkenRgb(center, 46);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(1.05, 0.92);
    const gradient = ctx.createRadialGradient(0, 0, radius * 0.04, 0, 0, radius);
    gradient.addColorStop(0.00, _rgba(center, a));
    gradient.addColorStop(0.48, _rgba(center, a * 0.98));
    gradient.addColorStop(0.82, _rgba(midEdge, a * 0.97));
    gradient.addColorStop(1.00, _rgba(edge, a));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function _drawPreviewOrganelleExternalShadow(ctx, x, y, radius, visual, opacity) {
    const shadowAngle = _lightAngle(visual);
    const rawGradient = Number(visual?.lightGradient);
    const strength = Number.isFinite(rawGradient) ? _clamp01(Math.max(0, rawGradient) * 4.85) : 0.0;
    const lightingOpacity = _clamp01(Math.max(_clamp01(opacity), 0.62));
    const alpha = 0.92 * strength * lightingOpacity;
    if (alpha <= 0.001 || !Number.isFinite(shadowAngle)) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(shadowAngle);
    _drawPreviewSoftCellSideShadow(ctx, radius, alpha, strength * lightingOpacity);
    ctx.restore();
}

function _fillPreviewFoodShape(ctx, foodId, x, y, radius, fillStyle, scale = 1.0) {
    const path = _foodPath(foodId);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(radius * scale, radius * scale);
    ctx.fillStyle = fillStyle;
    ctx.fill(path);
    ctx.restore();
}

const _previewFoodPathCache = new Map();
function _foodPath(foodId) {
    const key = Number(foodId) || 1;
    if (_previewFoodPathCache.has(key)) return _previewFoodPathCache.get(key);
    if (_previewFoodPathCache.size > 2000) _previewFoodPathCache.clear();
    const path = new Path2D();
    const random = _seededPreviewRandom(key);
    const points = 13;
    for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const radiusJitter = 0.82 + random() * 0.32;
        const x = Math.cos(angle) * radiusJitter;
        const y = Math.sin(angle) * radiusJitter;
        if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    path.closePath();
    _previewFoodPathCache.set(key, path);
    return path;
}

function _seededPreviewRandom(seed) {
    let x = (Math.floor(seed) || 1) >>> 0;
    return () => {
        x = Math.imul(x ^ (x >>> 15), 2246822519) >>> 0;
        x = Math.imul(x ^ (x >>> 13), 3266489917) >>> 0;
        x = (x ^ (x >>> 16)) >>> 0;
        return x / 0x100000000;
    };
}

function _fillPreviewBodyRadialRgb(ctx, cx, cy, radius, color, alpha) {
    const a = _clamp01(alpha);
    if (a <= 0.001) return;

    const gradient = ctx.createRadialGradient(cx, cy, Math.max(0.0, radius * 0.03), cx, cy, radius);
    gradient.addColorStop(0.0, _rgba(color, a));
    gradient.addColorStop(0.58, _rgba(color, a * 0.86));
    gradient.addColorStop(0.92, _rgba(color, a * 0.58));
    gradient.addColorStop(1.0, _rgba(color, a * 0.50));

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}


function _fillPreviewSolidCircle(ctx, cx, cy, radius, color, alpha) {
    const a = _clamp01(alpha);
    if (a <= 0.001) return;
    ctx.save();
    ctx.fillStyle = _rgba(color, a);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function _fillPreviewEllipse(ctx, x, y, sx, sy, rotation, color, alpha) {
    const a = _clamp01(alpha);
    if (a <= 0.001) return;
    ctx.save();
    ctx.fillStyle = _rgba(color, a);
    ctx.beginPath();
    ctx.ellipse(x, y, sx, sy, rotation, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function _drawPreviewBioluminescenceGlowRgb(ctx, cx, cy, radius, color, bioluminescence, baseAlpha) {
    drawInternalBioluminescenceGlow(ctx, {
        x: cx,
        y: cy,
        radius,
        color: color ?? {r: 83, g: 255, b: 139},
        expression: bioluminescence,
        baseAlpha,
        rgba: _rgba,
    });
}

function _drawPreviewMembrane(ctx, cx, cy, radius, color, alpha) {
    const a = _clamp01(alpha);
    if (a <= 0.001) return;

    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.08, cx, cy, radius);
    gradient.addColorStop(0.00, _rgba(color, a * 0.18));
    gradient.addColorStop(0.68, _rgba(color, a * 0.34));
    gradient.addColorStop(0.90, _rgba(color, a * 0.70));
    gradient.addColorStop(0.98, _rgba(color, a * 0.96));
    gradient.addColorStop(1.00, _rgba(color, a));

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = _rgba(color, Math.min(1.0, a * 0.92));
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0.0, radius - 0.35), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function _drawPreviewExternalLight(ctx, cx, cy, radius, visual, cursorLight, options = {}) {
    const {
        showShadow = true,
        showHighlight = true,
        cellOpacity = 1.0,
    } = options;

    const cursorAngle = cursorLight && Number.isFinite(cursorLight.x) && Number.isFinite(cursorLight.y)
        ? Math.atan2(cursorLight.y - cy, cursorLight.x - cx)
        : null;
    const shadowAngle = cursorAngle ?? _lightAngle(visual);
    const highlightAngle = cursorAngle ?? _highlightAngle(visual);

    const shadowStrength = Number.isFinite(Number(visual?.lightGradient))
        ? _clamp01(Math.max(0, Number(visual.lightGradient)) * 5.35)
        : (cursorAngle == null ? 0.0 : 0.50);
    const highlightStrength = Number.isFinite(Number(visual?.highlightStrength))
        ? _clamp01(Math.max(0, Number(visual.highlightStrength)))
        : (cursorAngle == null ? 0.0 : 0.64);
    const highlightClarity = Number.isFinite(Number(visual?.highlightClarity))
        ? _clamp01(Number(visual.highlightClarity))
        : 1.0;
    const baseOpacity = _clamp01(cellOpacity);
    const lightingOpacity = _clamp01(Math.max(baseOpacity, cursorAngle == null ? 0.68 : 0.76));

    const shadowAlpha = 0.92 * shadowStrength * lightingOpacity;
    const highlightAlpha = 0.84 * highlightStrength * lightingOpacity;
    if (shadowAlpha <= 0.001 && highlightAlpha <= 0.001) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);

    if (showShadow && shadowAlpha > 0.001 && Number.isFinite(shadowAngle)) {
        ctx.save();
        ctx.rotate(shadowAngle);
        _drawPreviewSoftCellSideShadow(ctx, radius, shadowAlpha, shadowStrength * lightingOpacity);
        ctx.restore();
    }

    if (showHighlight && highlightAlpha > 0.001 && Number.isFinite(highlightAngle)) {
        ctx.save();
        ctx.rotate(highlightAngle);
        _drawPreviewSoftCellHighlightCrescent(
            ctx,
            radius,
            highlightAlpha,
            highlightStrength * lightingOpacity,
            highlightClarity
        );
        ctx.restore();
    }

    ctx.restore();
}

function _drawPreviewSoftCellSideShadow(ctx, radius, alpha, strength) {
    const edgeAlpha = _clamp01(Math.max(alpha * 0.58, 0.58 * strength));
    const midAlpha = _clamp01(0.42 * strength);
    if (edgeAlpha <= 0.001 && midAlpha <= 0.001) return;

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    const gradient = ctx.createLinearGradient(-radius, 0, radius, 0);
    gradient.addColorStop(0.00, `rgba(0, 0, 0, ${edgeAlpha.toFixed(3)})`);
    gradient.addColorStop(0.32, `rgba(0, 0, 0, ${midAlpha.toFixed(3)})`);
    gradient.addColorStop(0.64, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1.00, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function _drawPreviewSoftCellHighlightCrescent(ctx, radius, alpha, strength, clarity = 1.0) {
    const crispness = _clamp01(clarity);
    const softness = 1.0 - crispness;
    const mainAlpha = _clamp01(alpha * (0.82 + 0.18 * crispness));
    const coreAlpha = _clamp01(0.52 * strength * (0.44 + 0.56 * crispness));
    if (mainAlpha <= 0.001 && coreAlpha <= 0.001) return;

    const outerRadius = radius * (0.80 + softness * 0.14);
    const innerRadius = radius * (0.06 + softness * 0.03);
    const centerX = radius * 0.78;
    const centerY = -radius * 0.06;
    const scaleY = 0.70 - softness * 0.08;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(centerX, centerY);
    ctx.scale(1, scaleY);

    const gradient = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, outerRadius);
    gradient.addColorStop(0.00, `rgba(255, 255, 255, ${(mainAlpha * 0.90).toFixed(3)})`);
    gradient.addColorStop(0.22, `rgba(255, 255, 255, ${(mainAlpha * 0.64).toFixed(3)})`);
    gradient.addColorStop(0.50, `rgba(255, 255, 255, ${(mainAlpha * 0.20).toFixed(3)})`);
    gradient.addColorStop(0.80, `rgba(255, 255, 255, ${(mainAlpha * 0.05).toFixed(3)})`);
    gradient.addColorStop(1.00, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    if (coreAlpha > 0.001) {
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.30);
        coreGradient.addColorStop(0.00, `rgba(255, 255, 255, ${coreAlpha.toFixed(3)})`);
        coreGradient.addColorStop(0.42, `rgba(255, 255, 255, ${(coreAlpha * 0.20).toFixed(3)})`);
        coreGradient.addColorStop(1.00, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.30, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}


function _beginPreviewRightHighlightCrescentPath(ctx, radius) {
    const innerCenterX = -radius * 0.50;
    const innerRadius = radius * 1.14;
    const distance = Math.max(1.0e-6, Math.abs(innerCenterX));

    const intersectionX = _clamp(
        (radius * radius - innerRadius * innerRadius + distance * distance) / (2 * distance),
        -radius * 0.98,
        radius * 0.98
    );
    const intersectionY = Math.sqrt(Math.max(0.0, radius * radius - intersectionX * intersectionX));

    const outerAngle = Math.atan2(intersectionY, intersectionX);
    const innerTopAngle = Math.atan2(intersectionY, intersectionX - innerCenterX);
    const innerBottomAngle = Math.atan2(-intersectionY, intersectionX - innerCenterX);

    ctx.beginPath();
    ctx.moveTo(intersectionX, -intersectionY);
    ctx.arc(0, 0, radius, -outerAngle, outerAngle, false);
    ctx.arc(innerCenterX, 0, innerRadius, innerTopAngle, innerBottomAngle, true);
    ctx.closePath();
}

function _drawForcesMode(ctx, cell, visual, cx, cy) {
    _selectedHitTargets = [];
    _drawForcesCellBody(ctx, cx, cy);

    _drawPreviewExternalLight(ctx, cx, cy, PREVIEW_RADIUS, visual, null, {
        showShadow: true,
        showHighlight: false,
        cellOpacity: _previewAlpha(
            visual.cellColor?.opacity
            ?? cell?.opacity
            ?? visual.cytosolColor?.opacity
            ?? 0.1
        ),
    });

    _drawLightDirectionArrows(ctx, cell, visual, cx, cy, _selectedHitTargets, _selectedHover);
    _drawMotionArrows(ctx, cell, cx, cy, _selectedHitTargets, _selectedHover);
}

function _drawForcesCellBody(ctx, cx, cy) {
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, ${FORCES_CELL_SHADOW_ALPHA})`;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, PREVIEW_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = FORCES_CELL_FILL;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = FORCES_CELL_STROKE;
    ctx.lineWidth = FORCES_CELL_STROKE_WIDTH;
    ctx.stroke();
    ctx.restore();
}

function _drawMotionArrows(ctx, cell, cx, cy, hitTargets, hover) {
    const motion = cell.motion ?? {};
    const colors = _motionColors(motion);
    const speed = motion.speed ?? 0;
    const gravForce = motion.gravForce ?? 0;
    const dragForce = motion.dragForce ?? 0;
    const gravityDirection = _directionFromDto(motion.gravDirX, motion.gravDirY);
    const dragDirection = _directionFromDto(motion.dragDirX, motion.dragDirY);
    const speedDirection = _directionFromDto(motion.speedDirX, motion.speedDirY);
    const gravColor = gravForce >= 0 ? colors.gravity : colors.buoyancy;

    for (const impulse of (cell.events ?? []).filter(e => e.type === "impulse")) {
        const alpha = _eventAlpha(impulse);
        const dir = _directionFromDto(impulse.normalX, impulse.normalY);
        const mag = Math.min(MAX_FORCE_ARROW, Math.abs(impulse.impulse ?? 0) * 0.25);
        if (alpha > 0 && dir && mag > 1) {
            const x2 = cx - dir.x * PREVIEW_RADIUS;
            const y2 = cy - dir.y * PREVIEW_RADIUS;
            const x1 = x2 - dir.x * mag;
            const y1 = y2 - dir.y * mag;
            _drawDoubleHeadArrow(ctx, x1, y1, x2, y2, colors.impulse, 2, alpha, hover?.id === "collision-impulse");
            hitTargets.push({type:"segment", kind:"force", id:"collision-impulse", tooltip: t("Collision impulse"), x1, y1, x2, y2, hitRadius: FORCE_ARROW_HIT_RADIUS});
        }
    }
    if (Math.abs(gravForce) > 0.05 && gravityDirection) {
        const mag = Math.min(MAX_FORCE_ARROW, Math.sqrt(Math.abs(gravForce)) * 6.0);
        const x2 = cx + gravityDirection.x * mag, y2 = cy + gravityDirection.y * mag;
        _drawArrow(ctx, cx, cy, x2, y2, gravColor, 2.5, 1, hover?.id === "gravity");
        hitTargets.push({type:"segment", kind:"force", id:"gravity", tooltip: gravForce >= 0 ? t("Gravity force") : t("Buoyancy force"), x1:cx, y1:cy, x2, y2});
    }
    if (Math.abs(dragForce) > 0.05 && dragDirection) {
        const mag = Math.min(MAX_FORCE_ARROW, Math.log1p(Math.abs(dragForce)) * 6.0);
        const x2 = cx + dragDirection.x * mag, y2 = cy + dragDirection.y * mag;
        _drawArrow(ctx, cx, cy, x2, y2, colors.drag, 2.5, 1, hover?.id === "drag");
        hitTargets.push({type:"segment", kind:"force", id:"drag", tooltip: t("Drag force"), x1:cx, y1:cy, x2, y2});
    }
    _drawRotationalDragTorqueArrow(ctx, motion, cx, cy, colors, hitTargets, hover);
    _drawFlagellumTorqueArrow(ctx, motion, cx, cy, colors, hitTargets, hover);
    _drawTotalRotationalTorqueArrow(ctx, motion, cx, cy, colors, hitTargets, hover);
    _drawFlagellumForceArrows(ctx, cell, cx, cy, colors, hitTargets, hover);
    _drawTotalForceArrow(ctx, motion, cx, cy, colors, hitTargets, hover);

    if (speed > 0.001 && speedDirection) {
        const mag = Math.min(MAX_FORCE_ARROW, Math.max(4, Math.sqrt(speed) * 36));
        const x2 = cx + speedDirection.x * mag, y2 = cy + speedDirection.y * mag;
        _drawDashedArrow(ctx, cx, cy, x2, y2, colors.speed, 1.5, hover?.id === "speed");
        hitTargets.push({type:"segment", kind:"force", id:"speed", tooltip: t("Speed"), x1:cx, y1:cy, x2, y2});
    }

    _drawAngularVelocityArrow(ctx, motion, cx, cy, colors, hitTargets, hover);
}

function _drawRotationalDragTorqueArrow(ctx, motion, cx, cy, colors, hitTargets, hover) {
    const torque = Math.max(0, Number(motion.rotationalDragTorque ?? 0) || 0);
    const omega = Number(motion.angularVelocity ?? 0) || 0;
    if (torque <= 0.0001 || Math.abs(omega) <= 0.0001) return;

    // Rotational drag is a torque, not a linear force. In Forces mode it is
    // visualized as a tangential arrow outside the cell, opposite to current
    // angular velocity. It uses the same color as linear drag because both are
    // viscous resistance from the surrounding medium.
    const anchorAngle = -Math.PI * 0.25;
    const radialX = Math.cos(anchorAngle);
    const radialY = Math.sin(anchorAngle);
    const dragSign = -Math.sign(omega);
    const tangentX = -radialY * dragSign;
    const tangentY = radialX * dragSign;
    const radius = PREVIEW_RADIUS + 18;
    const mag = Math.min(MAX_FORCE_ARROW * 0.9, Math.max(7, Math.log1p(torque) * 13.0));
    const startX = cx + radialX * radius - tangentX * mag * 0.5;
    const startY = cy + radialY * radius - tangentY * mag * 0.5;
    const endX = startX + tangentX * mag;
    const endY = startY + tangentY * mag;

    _drawArrow(ctx, startX, startY, endX, endY, colors.rotationalDrag, 2.3, 0.95, hover?.id === "rotational-drag");
    hitTargets.push({
        type: "segment",
        kind: "force",
        id: "rotational-drag",
        tooltip: t("Rotational drag torque"),
        x1: startX,
        y1: startY,
        x2: endX,
        y2: endY,
        hitRadius: FORCE_ARROW_HIT_RADIUS,
    });
}

function _drawTotalForceArrow(ctx, motion, cx, cy, colors, hitTargets, hover) {
    const force = Math.max(0, Number(motion.totalForce ?? 0) || 0);
    const direction = _directionFromDto(motion.totalForceDirX, motion.totalForceDirY);
    if (force <= 0.0001 || !direction) return;

    const mag = Math.min(MAX_FORCE_ARROW * 1.08, Math.max(8, Math.log1p(force) * 7.5));
    const x2 = cx + direction.x * mag;
    const y2 = cy + direction.y * mag;
    _drawArrow(ctx, cx, cy, x2, y2, colors.totalForce, 3.0, 0.95, hover?.id === "total-force");
    hitTargets.push({
        type: "segment",
        kind: "force",
        id: "total-force",
        tooltip: t("Total force"),
        x1: cx,
        y1: cy,
        x2,
        y2,
        hitRadius: FORCE_ARROW_HIT_RADIUS,
    });
}

function _drawAngularVelocityArrow(ctx, motion, cx, cy, colors, hitTargets, hover) {
    const omega = Number(motion.angularVelocity ?? 0) || 0;
    if (Math.abs(omega) <= 0.0001) return;

    const sign = Math.sign(omega);
    const anchorAngle = -Math.PI * 0.58;
    const radius = PREVIEW_RADIUS + 34;
    const radialX = Math.cos(anchorAngle);
    const radialY = Math.sin(anchorAngle);
    const tangentX = -radialY * sign;
    const tangentY = radialX * sign;
    const mag = Math.min(MAX_FORCE_ARROW * 0.82, Math.max(7, Math.sqrt(Math.abs(omega)) * 34));
    const startX = cx + radialX * radius - tangentX * mag * 0.5;
    const startY = cy + radialY * radius - tangentY * mag * 0.5;
    const endX = startX + tangentX * mag;
    const endY = startY + tangentY * mag;

    _drawDashedArrow(ctx, startX, startY, endX, endY, colors.angularVelocity, 1.5, hover?.id === "angular-velocity");
    hitTargets.push({
        type: "segment",
        kind: "force",
        id: "angular-velocity",
        tooltip: t("Angular velocity"),
        x1: startX,
        y1: startY,
        x2: endX,
        y2: endY,
        hitRadius: FORCE_ARROW_HIT_RADIUS,
    });
}

function _drawFlagellumTorqueArrow(ctx, motion, cx, cy, colors, hitTargets, hover) {
    const torque = Number(motion.flagellumTorque ?? 0) || 0;
    if (Math.abs(torque) <= 0.0001) return;

    // This is the signed sum of all torque values produced by flagella only:
    // Σ(rᵢ × Fᵢ). It is shown separately from total rotational torque so the
    // user can see what part of rotation comes directly from flagella.
    const sign = Math.sign(torque);
    const anchorAngle = Math.PI * 0.43;
    const radius = PREVIEW_RADIUS + 48;
    const radialX = Math.cos(anchorAngle);
    const radialY = Math.sin(anchorAngle);
    const tangentX = -radialY * sign;
    const tangentY = radialX * sign;
    const mag = Math.min(MAX_FORCE_ARROW * 0.9, Math.max(7, Math.log1p(Math.abs(torque)) * 13.0));
    const startX = cx + radialX * radius - tangentX * mag * 0.5;
    const startY = cy + radialY * radius - tangentY * mag * 0.5;
    const endX = startX + tangentX * mag;
    const endY = startY + tangentY * mag;

    _drawArrow(ctx, startX, startY, endX, endY, colors.flagellumTorque, 2.4, 0.94, hover?.id === "flagellum-torque");
    hitTargets.push({
        type: "segment",
        kind: "force",
        id: "flagellum-torque",
        tooltip: t("Flagellum torque"),
        x1: startX,
        y1: startY,
        x2: endX,
        y2: endY,
        hitRadius: FORCE_ARROW_HIT_RADIUS,
    });
}

function _drawTotalRotationalTorqueArrow(ctx, motion, cx, cy, colors, hitTargets, hover) {
    const torque = Number(motion.totalRotationalTorque ?? 0) || 0;
    if (Math.abs(torque) <= 0.0001) return;

    const sign = Math.sign(torque);
    const anchorAngle = Math.PI * 0.23;
    const radius = PREVIEW_RADIUS + 30;
    const radialX = Math.cos(anchorAngle);
    const radialY = Math.sin(anchorAngle);
    const tangentX = -radialY * sign;
    const tangentY = radialX * sign;
    const mag = Math.min(MAX_FORCE_ARROW * 0.95, Math.max(7, Math.log1p(Math.abs(torque)) * 13.0));
    const startX = cx + radialX * radius - tangentX * mag * 0.5;
    const startY = cy + radialY * radius - tangentY * mag * 0.5;
    const endX = startX + tangentX * mag;
    const endY = startY + tangentY * mag;

    _drawArrow(ctx, startX, startY, endX, endY, colors.totalRotationalTorque, 2.6, 0.96, hover?.id === "total-rotational-torque");
    hitTargets.push({
        type: "segment",
        kind: "force",
        id: "total-rotational-torque",
        tooltip: t("Total rotational torque"),
        x1: startX,
        y1: startY,
        x2: endX,
        y2: endY,
        hitRadius: FORCE_ARROW_HIT_RADIUS,
    });
}

function _drawFlagellumForceArrows(ctx, cell, cx, cy, colors, hitTargets, hover) {
    const slots = Array.isArray(cell?.flagellumSlots) ? cell.flagellumSlots : [];
    if (!slots.length) return;

    const sourceRadius = Math.max(1.0e-6, Number(cell?.radius ?? PREVIEW_RADIUS));
    const scale = PREVIEW_RADIUS / sourceRadius;
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const index = Number(slot.index ?? i);
        const bx = cx + (Number(slot.baseX ?? 0) || 0) * scale;
        const by = cy + (Number(slot.baseY ?? 0) || 0) * scale;
        const dx = Number(slot.directionX ?? 0) || 0;
        const dy = Number(slot.directionY ?? 0) || 0;
        const dlen = Math.hypot(dx, dy);
        const force = Math.max(0, Number(slot.force ?? 0) || 0);
        if (dlen > 0.001 && force > 0.0001) {
            const ux = dx / dlen;
            const uy = dy / dlen;
            const mag = Math.min(MAX_FORCE_ARROW, Math.max(7, Math.log1p(force) * 15.0));
            const x2 = bx + ux * mag;
            const y2 = by + uy * mag;
            const id = `flagellum-force-${index}`;
            _drawArrow(ctx, bx, by, x2, y2, colors.flagellumForce, 2.2, 0.92, hover?.id === id);
            hitTargets.push({type:"segment", kind:"force", id, tooltip: t("Flagellum force"), x1:bx, y1:by, x2, y2, hitRadius: FORCE_ARROW_HIT_RADIUS});
        }
    }
}


function _drawLightDirectionArrows(ctx, cell, visual, cx, cy, hitTargets, hover) {
    const light = Math.max(0, Number(cell.localLight ?? 0));
    if (light <= LIGHT_ARROW_MIN_VISIBLE_LIGHT) return;

    const light01 = _clamp01(light);
    const clarity = _clamp01(visual?.highlightClarity ?? visual?.lightGradient ?? 0);
    const sourceAngle = _sourceLightAngle(visual) ?? 0;
    const color = _motionColors(cell.motion ?? {}).light;
    const length = LIGHT_ARROW_MIN_LENGTH + (LIGHT_ARROW_MAX_LENGTH - LIGHT_ARROW_MIN_LENGTH) * Math.sqrt(light01);

    _drawBlurredLightArrows(ctx, cell, cx, cy, sourceAngle, clarity, length, color, hitTargets, hover);
}

function _drawBlurredLightArrows(ctx, cell, cx, cy, sourceAngle, clarity, length, color, hitTargets, hover) {
    const count = LIGHT_ARROW_COUNT;
    const blur = Math.pow(1 - _clamp01(clarity), LIGHT_DIRECTION_BLUR_POWER);
    const spread = Math.PI * 2 * blur;
    const tipDistance = PREVIEW_RADIUS + LIGHT_ARROW_TIP_GAP;
    const sourceUx = Math.cos(sourceAngle);
    const sourceUy = Math.sin(sourceAngle);
    const tangentX = -sourceUy;
    const tangentY = sourceUx;
    const flowAngle = sourceAngle + Math.PI;
    const active = hover?.id === "light-direction";

    for (let i = 0; i < count; i++) {
        const centered = i - (count - 1) * 0.5;
        const t = count === 1 ? 0.5 : i / (count - 1);

        // Clear direction: arrow directions are parallel, but tips are still
        // normalized to the same orbit distance around the cell.
        const parallelTipX = sourceUx * tipDistance + tangentX * centered * LIGHT_ARROW_PARALLEL_SPACING;
        const parallelTipY = sourceUy * tipDistance + tangentY * centered * LIGHT_ARROW_PARALLEL_SPACING;
        const parallelTipAngle = Math.atan2(parallelTipY, parallelTipX);

        // Blurred direction: tips spread around the whole cell and directions
        // gradually become radial, so the transition to "all arrows look at cell"
        // is smooth instead of snapping.
        const jitter = (hash01(Math.round((cell.id ?? 1) * 97), i + 41) - 0.5) * 0.05 * blur;
        const radialTipAngle = sourceAngle - spread / 2 + spread * t + jitter;
        const mix = _smoothstep(blur);
        const tipAngle = _lerpAngle(parallelTipAngle, radialTipAngle, mix);
        const arrowAngle = _lerpAngle(flowAngle, tipAngle + Math.PI, mix);

        const ex = cx + Math.cos(tipAngle) * tipDistance;
        const ey = cy + Math.sin(tipAngle) * tipDistance;
        const sx = ex - Math.cos(arrowAngle) * length;
        const sy = ey - Math.sin(arrowAngle) * length;

        _drawLightArrow(ctx, sx, sy, ex, ey, color, hitTargets, active);
    }
}

function _drawLightArrow(ctx, sx, sy, ex, ey, color, hitTargets, active) {
    _drawArrow(
        ctx,
        sx,
        sy,
        ex,
        ey,
        color,
        active ? LIGHT_ARROW_ACTIVE_LINE_WIDTH : LIGHT_ARROW_LINE_WIDTH,
        active ? 0.58 : 0.42,
        active
    );
    hitTargets.push({
        type: "segment",
        kind: "force",
        id: "light-direction",
        tooltip: t("Light direction"),
        x1: sx,
        y1: sy,
        x2: ex,
        y2: ey,
        hitRadius: FORCE_ARROW_HIT_RADIUS,
    });
}

function _lightAngle(visual) {
    if (Number.isFinite(visual?.lightDirectionAngle)) return _degreesToCanvasRadians(visual.lightDirectionAngle);
    return null;
}

function _highlightAngle(visual) {
    if (Number.isFinite(visual?.highlightDirectionAngle)) return _degreesToCanvasRadians(visual.highlightDirectionAngle);
    return _lightAngle(visual);
}

function _sourceLightAngle(visual) {
    if (Number.isFinite(visual?.highlightDirectionAngle)) return _degreesToCanvasRadians(visual.highlightDirectionAngle);
    if (Number.isFinite(visual?.lightDirectionAngle)) return _degreesToCanvasRadians(visual.lightDirectionAngle);
    return null;
}

function _degreesToCanvasRadians(degrees) {
    return Number(degrees) * Math.PI / 180;
}

function _motionColors(motion) {
    return {
        gravity: motion.gravityColor ?? DEFAULT_ARROW_COLORS.gravity,
        buoyancy: motion.buoyancyColor ?? DEFAULT_ARROW_COLORS.buoyancy,
        drag: motion.dragColor ?? DEFAULT_ARROW_COLORS.drag,
        rotationalDrag: motion.rotationalDragColor ?? DEFAULT_ARROW_COLORS.rotationalDrag,
        impulse: motion.impulseColor ?? DEFAULT_ARROW_COLORS.impulse,
        speed: motion.speedColor ?? DEFAULT_ARROW_COLORS.speed,
        angularVelocity: motion.angularVelocityColor ?? DEFAULT_ARROW_COLORS.angularVelocity,
        light: motion.lightColor ?? DEFAULT_ARROW_COLORS.light,
        flagellumForce: motion.flagellumForceColor ?? "#f59e0b",
        flagellumTorque: motion.flagellumTorqueColor ?? DEFAULT_ARROW_COLORS.flagellumTorque,
        totalForce: motion.totalForceColor ?? DEFAULT_ARROW_COLORS.totalForce,
        totalRotationalTorque: motion.totalRotationalTorqueColor ?? DEFAULT_ARROW_COLORS.totalRotationalTorque,
    };
}

function _drawArrow(ctx, x1, y1, x2, y2, color, lineWidth, alpha = 1, active = false) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (!Number.isFinite(len) || len <= 0.001) return;

    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const strokeWidth = active ? lineWidth + 0.35 : lineWidth;
    const headLength = Math.min(active ? 8.2 : 7.4, Math.max(3.2, len * 0.42));
    const headHalfWidth = Math.max(strokeWidth * 1.25, headLength * 0.42);
    const baseX = x2 - ux * headLength;
    const baseY = y2 - uy * headLength;
    const shaftEndX = baseX;
    const shaftEndY = baseY;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';

    if (len > headLength + 1.0) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(shaftEndX, shaftEndY);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(baseX + px * headHalfWidth, baseY + py * headHalfWidth);
    ctx.lineTo(baseX - px * headHalfWidth, baseY - py * headHalfWidth);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function _drawDoubleHeadArrow(ctx, x1, y1, x2, y2, color, lineWidth, alpha = 1, active = false) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headSize = active ? 6.45 : 6;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = active ? lineWidth + 0.35 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const firstX = x2 - Math.cos(angle) * headSize * 0.78;
    const firstY = y2 - Math.sin(angle) * headSize * 0.78;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(firstX, firstY); ctx.stroke();
    for (const offset of [0, headSize * 0.78]) {
        const hx = x2 - Math.cos(angle) * offset;
        const hy = y2 - Math.sin(angle) * offset;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - Math.cos(angle - Math.PI / 6) * headSize, hy - Math.sin(angle - Math.PI / 6) * headSize);
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - Math.cos(angle + Math.PI / 6) * headSize, hy - Math.sin(angle + Math.PI / 6) * headSize);
        ctx.stroke();
    }
    ctx.restore();
}

function _drawDashedArrow(ctx, x1, y1, x2, y2, color, lineWidth, active = false) {
    ctx.save();
    ctx.setLineDash([4, 3]);
    _drawArrow(ctx, x1, y1, x2, y2, color, lineWidth, active ? 0.78 : 0.70, active);
    ctx.restore();
}

function _previewVisualFromGenome(genome, draft = null) {
    const chloroplastEnabled = Boolean(genome?.chloroplastEnabled);
    const lysosomeEnabled = Boolean(genome?.lysosomeEnabled);
    const melaninEnabled = Boolean(genome?.melaninEnabled);
    const chlor = chloroplastEnabled ? Math.max(0.15, _clamp01((genome?.chlorophyll ?? 0) / 100)) : 0;
    const carot = chloroplastEnabled ? _clamp01((genome?.carotenoids ?? 0) / 100) : 0;
    const amount = chloroplastEnabled ? Math.max(0, Math.round(genome?.chloroplastAmount ?? 0)) : 0;
    const lysosomeAmount = lysosomeEnabled ? Math.max(0, Math.round(genome?.lysosomeAmount ?? 0)) : 0;
    const flagellumEnabled = Boolean(genome?.flagellumEnabled);
    const flagellumCount = flagellumEnabled ? Math.max(0, Math.min(2, Math.round(genome?.flagellumCount ?? 1))) : 0;
    const lysosomeEnzyme = _clamp01((genome?.lysosomeEnzymeActivity ?? 0) / 100);
    const melanin = melaninEnabled ? _clamp01((genome?.melaninPercent ?? 0) / 100) : 0;
    const bioluminescence = genome?.bioluminescenceEnabled ? _clamp01((genome?.bioluminescence ?? 0) / 100) : 0;
    const cellDamage = _clamp01(draft?.startCytosolDamage ?? 0);
    const cpDamage = chloroplastEnabled ? _clamp01(draft?.startCpDamage ?? 0) : 0;
    const cpArea = amount * 4;
    const lysosomeArea = lysosomeAmount * PREVIEW_LYSOSOME_AREA_FACTOR;
    const previewCellArea = Math.max(1, _draftCellAreaFromGenome(genome));
    const coverage = _clamp01(cpArea / previewCellArea);
    const lysosomeCoverage = _clamp01(lysosomeArea / previewCellArea);
    const pigmentDepth = coverage * (2.4 * chlor + 0.42 * carot);
    const pigmentPresence = Math.max(chlor, carot);
    const chlorophyllColor = _mixRgb({r: 154, g: 210, b: 82}, {r: 28, g: 96, b: 40}, _clamp01((chlor - 0.15) / 0.85));
    const chloroplastPigmentColor = _mixWeighted(
        chlorophyllColor, Math.max(0.001, chlor),
        {r: 128, g: 72, b: 32}, carot,
        {r: 238, g: 240, b: 232}, 0
    );
    const chloroplastColor = _mixRgb(chloroplastPigmentColor, {r: 238, g: 240, b: 232}, cpDamage * 0.5);
    const lysosomeBaseColor = _lysosomeAcidColor(lysosomeEnzyme);
    const cytosolOpacity = _clamp01(0.12 + 0.22 * (1 - Math.exp(-pigmentDepth)));
    const cytosolColor = {
        ..._mixRgb({r: 238, g: 240, b: 232}, {r: 96, g: 88, b: 76}, cellDamage),
        opacity: cytosolOpacity,
    };
    const membraneOpacity = _clamp01(DEFAULT_MEMBRANE_OPACITY + 0.42 * melanin);
    const membraneChloroplastWeight = chloroplastEnabled ? Math.sqrt(Math.max(0, cpArea) / previewCellArea) : 0;
    const membraneLysosomeWeight = lysosomeEnabled ? Math.sqrt(Math.max(0, lysosomeArea) / previewCellArea) : 0;
    const membraneMelaninWeight = melaninEnabled ? Math.sqrt(melanin) : 0;
    const membraneColor = _mixWeighted4(
        {r: 238, g: 240, b: 232}, 1.0,
        chloroplastColor, membraneChloroplastWeight,
        lysosomeBaseColor, membraneLysosomeWeight,
        {r: 65, g: 43, b: 30}, membraneMelaninWeight
    );
    return {
        cellColor: {...cytosolColor, opacity: cytosolOpacity},
        cytosolColor,
        membraneColor: {...membraneColor, opacity: membraneOpacity},
        nucleoidColor: {r: 82, g: 72, b: 150, opacity: 0.82},
        chloroplastColor: {...chloroplastColor, opacity: chloroplastEnabled ? _clamp01(0.34 + 0.66 * pigmentPresence) : 0},
        chloroplastAmount: amount,
        lysosomeColor: {...lysosomeBaseColor, opacity: lysosomeEnabled ? 0.72 : 0},
        lysosomeAmount,
        lysosomeGlowColor: {r:255,g:170,b:72},
        lysosomeGlowStrength: 0,
        flagellumColor: {...membraneColor, opacity: flagellumEnabled ? 1.0 : 0},
        flagellumCount,
        bioluminescenceColor: {r: 83, g: 255, b: 139},
        bioluminescenceExpression: bioluminescence,
    };
}

export function drawCreateCellPreview() {
    const prepared = preparePreviewCanvas(dom.createCellPreviewCtx, dom.createCellPreviewCanvas);
    if (!prepared || !state.cellDraft) return;
    _createHitTargets = [];
    const ctx = dom.createCellPreviewCtx;
    const {width, height} = prepared;
    let cx = width / 2;
    let cy = height / 2;
    const visual = _previewVisualFromGenome(state.cellDraft.genome, state.cellDraft);
    _syncCreatePreviewZoomAuto(width, height);
    const previewLayout = _currentCreatePreviewLayout(width, height);
    cx = previewLayout.cx;
    cy = previewLayout.cy;
    const previewRadius = previewLayout.radius;
    _drawPreviewBiologyCell(ctx, cx, cy, previewRadius, visual, null, selectedPreviewLayerCount(), _createPreviewCursor, _createHitTargets, _createHover, "general");

    const scope = String(state.createInfoScope ?? "general").toLowerCase();
    _ensurePreviewAnimationLoop();

    if (scope === "nucleus" || scope === "nucleoid") {
        const divisionAngleDeg = state.cellDraft.genome.divisionAngle ?? 0;
        const axisRad = (divisionAngleDeg - 90) * Math.PI / 180;
        const axisLen = previewRadius + 6;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(axisRad) * axisLen, cy + Math.sin(axisRad) * axisLen);
        ctx.lineTo(cx - Math.cos(axisRad) * axisLen, cy - Math.sin(axisRad) * axisLen);
        ctx.stroke();
        ctx.restore();
    }
}

function _syncCreatePreviewZoomAuto(width, height) {
    const genome = state.cellDraft?.genome ?? {};
    _syncPreviewZoomAuto("create", width, height, genome, null);
}

function _syncSelectedPreviewZoomAuto(width, height, cell) {
    const genome = cell?.genome ?? state.selectedStrain?.genome ?? {};
    _syncPreviewZoomAuto("selected", width, height, genome, cell);
}

function _syncPreviewZoomAuto(kind, width, height, genome, cell = null) {
    const zoom = kind === "selected" ? _selectedPreviewZoom : _createPreviewZoom;
    const scope = kind === "selected"
        ? String(state.selectedInfoScope ?? "general").toLowerCase()
        : String(state.createInfoScope ?? "general").toLowerCase();
    const normalizedScope = scope === "nucleoid" ? "nucleus" : scope;
    const scopeChanged = zoom.lastScope !== normalizedScope;
    const bodyRadius = _previewBodyRadiusForScale(genome, cell);
    const wasFitting = zoom.lockedToFit || zoom.target === 0.0 || zoom.level < 1.0 - CREATE_PREVIEW_ZOOM_STOP_EPS;
    const flagellumVisible = previewFlagellumCount(genome, cell) > 0;
    const wantsFit = normalizedScope === "flagellum" && flagellumVisible;

    if (!zoom.initialized) {
        zoom.initialized = true;
        zoom.level = wantsFit ? 0.0 : 1.0;
        zoom.target = zoom.level;
        zoom.lockedToFit = wantsFit;
        zoom.lastScope = normalizedScope;
        zoom.lastFitScope = wantsFit ? normalizedScope : null;
        _setPreviewNormalBodyRadiusCurrent(zoom, bodyRadius);
        _setPreviewDisplayBodyRadiusCurrent(zoom, bodyRadius);
        if (wantsFit) {
            _setPreviewZoomFitCurrent(zoom, _previewFitLayout(width, height, genome, cell));
        }
        return;
    }

    _ensurePreviewNormalBodyRadius(zoom, bodyRadius);
    _setPreviewDisplayBodyRadiusTarget(zoom, bodyRadius);

    if (scopeChanged) {
        // A new organelle/general tab must restore its default scale, but it is
        // still a visual transition. We animate the baseline body radius instead
        // of replacing it immediately, so area changes made in the previous tab
        // do not snap on tab switch.
        _setPreviewNormalBodyRadiusTarget(zoom, bodyRadius);
        zoom.lastScope = normalizedScope;
    }

    if (wantsFit) {
        const fit = _previewFitLayout(width, height, genome, cell);
        _setPreviewZoomFitTarget(zoom, fit);
        zoom.lockedToFit = true;
        zoom.lastFitScope = normalizedScope;
        zoom.target = 0.0;
        if (_previewZoomNeedsAnimation(zoom)) {
            _animatePreviewZoom(kind);
        }
        return;
    }

    if (wasFitting && !scopeChanged) {
        // Turning flagella off while the Flagellum tab is still selected should
        // also return to the normal default scale through the same smooth path
        // used by tab switches.
        _setPreviewNormalBodyRadiusTarget(zoom, bodyRadius);
    }
    zoom.lockedToFit = false;
    zoom.lastFitScope = null;
    zoom.target = 1.0;
    if (_previewZoomNeedsAnimation(zoom)) {
        _animatePreviewZoom(kind);
    }
}

function _currentCreatePreviewBodyRadius(canvas) {
    const width = _previewLogicalWidth(canvas);
    const height = _previewLogicalHeight(canvas);
    return _currentCreatePreviewLayout(width, height).radius;
}

function _currentCreatePreviewLayout(width, height) {
    return _currentPreviewLayout(width, height, state.cellDraft?.genome ?? {}, _createPreviewZoom, null);
}

function _currentSelectedPreviewLayout(width, height, cell) {
    return _currentPreviewLayout(width, height, cell?.genome ?? state.selectedStrain?.genome ?? {}, _selectedPreviewZoom, cell);
}

function _currentPreviewLayout(width, height, genome, zoom, cell = null) {
    const centerX = width / 2;
    const centerY = height / 2;
    const normalRadius = _normalPreviewScaledRadius(width, height, genome, cell, zoom);
    const zoomT = _smoothstep(_clamp01(zoom.level));
    const hasAnimatedFit = Number.isFinite(Number(zoom.fitRadius));
    const needsFitLayout = zoom.lockedToFit || zoom.target === 0.0 || zoom.level < 1.0 - CREATE_PREVIEW_ZOOM_STOP_EPS || hasAnimatedFit;
    const fit = needsFitLayout && !hasAnimatedFit ? _previewFitLayout(width, height, genome, cell) : null;
    const fitRadius = hasAnimatedFit
        ? Math.max(8, Number(zoom.fitRadius))
        : (fit?.radius ?? normalRadius);
    const fitCenter = Number.isFinite(Number(zoom.fitCx)) && Number.isFinite(Number(zoom.fitCy))
        ? {cx: Number(zoom.fitCx), cy: Number(zoom.fitCy)}
        : (fit ? {cx: fit.cx, cy: fit.cy} : {cx: centerX, cy: centerY});

    return {
        cx: fitCenter.cx + (centerX - fitCenter.cx) * zoomT,
        cy: fitCenter.cy + (centerY - fitCenter.cy) * zoomT,
        radius: fitRadius + (normalRadius - fitRadius) * zoomT,
    };
}

function _normalPreviewScaledRadius(width, height, genome, cell, zoom) {
    const normalRadius = _normalPreviewRadius(width, height);
    const desiredBodyRadius = _previewBodyRadiusForScale(genome, cell);
    const bodyRadius = Number.isFinite(Number(zoom?.displayBodyRadius)) && Number(zoom.displayBodyRadius) > 0
        ? Number(zoom.displayBodyRadius)
        : desiredBodyRadius;
    const baseline = Number.isFinite(Number(zoom?.normalBodyRadius)) && Number(zoom.normalBodyRadius) > 0
        ? Number(zoom.normalBodyRadius)
        : bodyRadius;
    return Math.max(4, normalRadius * bodyRadius / Math.max(1.0e-6, baseline));
}

function _createPreviewMetricsForCurrentDraft(options = {}) {
    const metrics = state.cellDraftPreview;
    if (!metrics || !state.cellDraft || !state.cellDraftPreviewSignature) return null;
    const exact = state.cellDraftPreviewSignature === _previewDraftSignature(state.cellDraft);
    return exact || options.allowStale ? metrics : null;
}

function _previewDraftSignature(draft) {
    const genome = draft?.genome ?? {};
    return JSON.stringify({
        genome,
        startNucleusDamage: draft?.startNucleusDamage ?? 0,
        startCytosolDamage: draft?.startCytosolDamage ?? 0,
        startCpDamage: draft?.startCpDamage ?? 0,
        startMembraneDamage: draft?.startMembraneDamage ?? 0,
        startLysosomeDamage: draft?.startLysosomeDamage ?? 0,
        startFlagellumDamage: draft?.startFlagellumDamage ?? 0,
    });
}

function _previewBodyRadiusForScale(genome = {}, cell = null) {
    const liveRadius = Number(cell?.radius);
    if (Number.isFinite(liveRadius) && liveRadius > 0) return liveRadius;
    return _draftBodyRadiusFromGenome(genome);
}

function _draftBodyRadiusFromGenome(genome = {}) {
    const metrics = _createPreviewMetricsForCurrentDraft({allowStale: true});
    const metricRadius = Number(metrics?.radius);
    if (Number.isFinite(metricRadius) && metricRadius > 0) return metricRadius;

    const baseRadius = Math.max(1.0, Number(state.config?.cellBaseRadius) || 6.0);
    return Math.max(baseRadius, Math.sqrt(_draftCellAreaFromGenome(genome) / Math.PI));
}

function _draftCellAreaFromGenome(genome = {}) {
    const metrics = _createPreviewMetricsForCurrentDraft({allowStale: true});
    const metricArea = Number(metrics?.cellArea);
    if (Number.isFinite(metricArea) && metricArea > 0) return metricArea;

    const cytosolArea = Math.max(0, Number(genome?.cytosolArea ?? 0) || 0) * 0.58;
    const chloroplastArea = Boolean(genome?.chloroplastEnabled)
        ? Math.max(0, Math.round(Number(genome?.chloroplastAmount ?? 0) || 0)) * 4.0
        : 0.0;
    const lysosomeArea = Boolean(genome?.lysosomeEnabled)
        ? Math.max(0, Math.round(Number(genome?.lysosomeAmount ?? 0) || 0)) * PREVIEW_LYSOSOME_AREA_FACTOR
        : 0.0;
    const energyArea = Math.max(0, Number(state.config?.cellRadiusScale) || 4.0) * 40.0;
    return Math.max(1.0e-6, 18.0 + energyArea + cytosolArea + chloroplastArea + lysosomeArea);
}

function _previewFitLayout(width, height, genome, cell = null) {
    const bounds = _flagellumBoundsForPreview(genome, cell);
    const normalRadius = _normalPreviewRadius(width, height);
    const marginX = _normalPreviewMargin(width, normalRadius);
    const marginY = _normalPreviewMargin(height, normalRadius);
    const availableWidth = Math.max(16, Number(width) - marginX * 2);
    const availableHeight = Math.max(16, Number(height) - marginY * 2);
    const boundsWidth = Math.max(0.001, bounds.maxX - bounds.minX);
    const boundsHeight = Math.max(0.001, bounds.maxY - bounds.minY);
    const radius = Math.min(normalRadius, Math.max(8, Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight)));
    const center = _previewFitCenter(width, height, bounds, radius);
    return {radius, ...center, bounds};
}

function _previewFitCenter(width, height, bounds, radius) {
    const normalRadius = _normalPreviewRadius(width, height);
    const marginX = _normalPreviewMargin(width, normalRadius);
    const marginY = _normalPreviewMargin(height, normalRadius);
    const minX = marginX - bounds.minX * radius;
    const maxX = Number(width) - marginX - bounds.maxX * radius;
    const minY = marginY - bounds.minY * radius;
    const maxY = Number(height) - marginY - bounds.maxY * radius;

    return {
        cx: minX <= maxX ? (minX + maxX) / 2 : (Number(width) - (bounds.minX + bounds.maxX) * radius) / 2,
        cy: minY <= maxY ? (minY + maxY) / 2 : (Number(height) - (bounds.minY + bounds.maxY) * radius) / 2,
    };
}

function _normalPreviewRadius(width, height) {
    const maxByCanvas = Math.min(Number(width) || 1, Number(height) || 1) * 0.5 - CREATE_PREVIEW_PADDING;
    return Math.max(8, Math.min(PREVIEW_RADIUS_EXPANDED, maxByCanvas > 0 ? maxByCanvas : PREVIEW_RADIUS_EXPANDED));
}

function _normalPreviewMargin(size, normalRadius) {
    const margin = (Number(size) || 1) * 0.5 - Math.max(0, Number(normalRadius) || PREVIEW_RADIUS_EXPANDED);
    return Math.max(CREATE_PREVIEW_PADDING, margin);
}

function _flagellumBoundsForPreview(genome = {}, cell = null) {
    const bounds = {minX: -1, minY: -1, maxX: 1, maxY: 1};
    if (previewFlagellumCount(genome, cell) <= 0) {
        return bounds;
    }

    const slots = _flagellumSlotsForPreviewBounds(genome, cell);
    for (const slot of slots) {
        const baseX = Number(slot.baseX) || 0;
        const baseY = Number(slot.baseY) || 0;
        const dirX = Number(slot.directionX) || 0;
        const dirY = Number(slot.directionY) || -1;
        const dirLen = Math.hypot(dirX, dirY) || 1;
        const tailX = -dirX / dirLen;
        const tailY = -dirY / dirLen;
        const normalX = -tailY;
        const normalY = tailX;
        const length = Math.max(0, Number(slot.length) || _flagellumLengthFactorFromGenome(genome));
        const thickness = Math.max(0.01, Number(slot.thickness ?? 0.08) || 0.08);
        const rootWidth = thickness * 1.10;
        const tipWidth = Math.max(0.006, thickness * 0.06);
        const motor01 = _clamp01(Number(slot?.motorPower ?? genome?.flagellumMotorPower ?? 30) / 100);
        const beatDrive = Math.sqrt(motor01);
        const maxAmp = length * 0.19
            * Math.pow(motor01, 0.72)
            * (0.24 + 0.76 * beatDrive)
            * (0.86 + 0.05 * motor01);

        for (const t of [0, 0.16, 0.35, 0.58, 0.80, 1.0]) {
            const x = baseX + tailX * length * t;
            const y = baseY + tailY * length * t;
            const widthAtT = _flagellumWidthFactorAt(t, rootWidth, tipWidth);
            const distalGain = _smoothstep((t - 0.16) / Math.max(1.0e-6, 1.0 - 0.16));
            const envelope = Math.sin(t * Math.PI * 0.92) * (0.10 + 0.90 * distalGain);
            const lateral = Math.max(widthAtT, Math.max(0, envelope) * maxAmp);
            const longitudinal = t >= 0.999 ? tipWidth : (t <= 0.001 ? rootWidth * 0.42 : widthAtT * 0.25);
            _expandOrientedBounds(bounds, x, y, normalX, normalY, lateral, tailX, tailY, longitudinal);
        }
    }

    return bounds;
}

function _flagellumSlotsForPreviewBounds(genome = {}, cell = null) {
    const sourceRadius = Math.max(1.0e-6, Number(cell?.radius) || 1);
    const liveSlots = Array.isArray(cell?.flagellumSlots) ? cell.flagellumSlots : [];
    if (liveSlots.length > 0) {
        return liveSlots.map((slot, index) => {
            const baseX = Number(slot?.baseX);
            const baseY = Number(slot?.baseY);
            const length = Number(slot?.length);
            const thickness = Number(slot?.thickness);
            return {
                baseX: Number.isFinite(baseX) ? baseX / sourceRadius : 0,
                baseY: Number.isFinite(baseY) ? baseY / sourceRadius : 1,
                directionX: Number(slot?.directionX ?? 0) || 0,
                directionY: Number(slot?.directionY ?? -1) || -1,
                length: Number.isFinite(length) ? length / sourceRadius : _flagellumLengthFactorFromGenome(genome),
                thickness: Number.isFinite(thickness) ? thickness / sourceRadius : _flagellumThicknessFactorFromGenome(genome),
                index,
            };
        });
    }

    const count = Math.max(0, Math.min(2, previewFlagellumCount(genome, cell)));
    const directionAngle = Number(cell?.directionAngle ?? 0) || 0;
    const forward = (directionAngle - 90) * Math.PI / 180;
    const rearPlacement = Math.PI;
    const spread = _effectiveFlagellumPairSpreadRadians(genome);
    const steering = _clamp(Number(genome?.flagellumSteeringAsymmetry ?? 0) / 100, -1, 1);
    const length = _flagellumLengthFactorFromGenome(genome);
    const thickness = _flagellumThicknessFactorFromGenome(genome);
    const slots = [];

    for (let i = 0; i < count; i++) {
        const side = count > 1 ? (i === 0 ? -1 : 1) : 0;
        const relative = count > 1 ? rearPlacement + side * spread * 0.5 : rearPlacement;
        const attachment = forward + relative;
        const thrust = count > 1 ? forward : forward + steering * 28 * Math.PI / 180;
        slots.push({
            index: i,
            baseX: Math.cos(attachment),
            baseY: Math.sin(attachment),
            directionX: Math.cos(thrust),
            directionY: Math.sin(thrust),
            length,
            thickness,
        });
    }

    return slots;
}

function _expandBounds(bounds, x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
}
function _expandOrientedBounds(bounds, x, y, normalX, normalY, lateral, tailX, tailY, longitudinal) {
    const lat = Math.max(0, Number(lateral) || 0);
    const long = Math.max(0, Number(longitudinal) || 0);
    for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
            _expandBounds(
                bounds,
                x + normalX * lat * sx + tailX * long * sy,
                y + normalY * lat * sx + tailY * long * sy
            );
        }
    }
}

function _flagellumWidthFactorAt(t, rootWidth, tipWidth) {
    const clamped = _clamp01(t);
    return tipWidth + (rootWidth - tipWidth) * Math.pow(1.0 - clamped, 2.30);
}


function _flagellumThicknessFactorFromGenome(genome = {}) {
    const length = _flagellumLengthFactorFromGenome(genome);
    const t = _clamp01((length - 1.0) / 3.0);
    const thickness = 0.112 - (0.112 - 0.050) * Math.pow(t, 0.82);
    const pairScale = Math.round(Number(genome?.flagellumCount ?? 1)) >= 2 ? 0.92 : 1.0;
    return thickness * pairScale;
}

function _minFlagellumPairSpreadRadians(genome = {}) {
    const rootHalfWidthToRadius = _flagellumThicknessFactorFromGenome(genome) * 1.10;
    return 2 * Math.asin(Math.max(0, Math.min(0.95, rootHalfWidthToRadius)));
}

function _maxFlagellumPairSpreadRadians(genome = {}) {
    const rootHalfWidthToRadius = _flagellumThicknessFactorFromGenome(genome) * 1.10;
    const margin = 2 * Math.asin(Math.max(0, Math.min(0.95, rootHalfWidthToRadius)));
    return Math.max(_minFlagellumPairSpreadRadians(genome), Math.PI - margin);
}

function _effectiveFlagellumPairSpreadRadians(genome = {}) {
    const minSpread = _minFlagellumPairSpreadRadians(genome);
    const maxSpread = _maxFlagellumPairSpreadRadians(genome);
    const raw = Number(genome?.flagellumPairSpreadAngle ?? 36);
    const t = _clamp01((Number.isFinite(raw) ? raw : 36) / 180);
    return minSpread + (maxSpread - minSpread) * t;
}

function _ensurePreviewNormalBodyRadius(zoom, bodyRadius) {
    if (!Number.isFinite(Number(zoom.normalBodyRadius)) || Number(zoom.normalBodyRadius) <= 0) {
        _setPreviewNormalBodyRadiusCurrent(zoom, bodyRadius);
    } else if (!Number.isFinite(Number(zoom.normalTargetBodyRadius)) || Number(zoom.normalTargetBodyRadius) <= 0) {
        zoom.normalTargetBodyRadius = zoom.normalBodyRadius;
    }
}

function _setPreviewNormalBodyRadiusCurrent(zoom, bodyRadius) {
    const radius = Math.max(1.0e-6, Number(bodyRadius) || 1.0);
    zoom.normalBodyRadius = radius;
    zoom.normalTargetBodyRadius = radius;
}

function _setPreviewNormalBodyRadiusTarget(zoom, bodyRadius) {
    const radius = Math.max(1.0e-6, Number(bodyRadius) || 1.0);
    if (!Number.isFinite(Number(zoom.normalBodyRadius)) || Number(zoom.normalBodyRadius) <= 0) {
        zoom.normalBodyRadius = radius;
    }
    zoom.normalTargetBodyRadius = radius;
}

function _previewNormalBodyTargetDistance(zoom) {
    if (!Number.isFinite(Number(zoom?.normalTargetBodyRadius))) return 0.0;
    return Math.abs(Number(zoom.normalTargetBodyRadius) - (Number(zoom.normalBodyRadius) || 0));
}

function _setPreviewDisplayBodyRadiusCurrent(zoom, bodyRadius) {
    const radius = Math.max(1.0e-6, Number(bodyRadius) || 1.0);
    zoom.displayBodyRadius = radius;
    zoom.displayTargetBodyRadius = radius;
}

function _setPreviewDisplayBodyRadiusTarget(zoom, bodyRadius) {
    const radius = Math.max(1.0e-6, Number(bodyRadius) || 1.0);
    if (!Number.isFinite(Number(zoom.displayBodyRadius)) || Number(zoom.displayBodyRadius) <= 0) {
        zoom.displayBodyRadius = radius;
    }
    zoom.displayTargetBodyRadius = radius;
}

function _previewDisplayBodyTargetDistance(zoom) {
    if (!Number.isFinite(Number(zoom?.displayTargetBodyRadius))) return 0.0;
    return Math.abs(Number(zoom.displayTargetBodyRadius) - (Number(zoom.displayBodyRadius) || 0));
}

function _previewApproach(current, target, alpha) {
    return current + (target - current) * alpha;
}

function _setPreviewZoomFitCurrent(zoom, fit) {
    _setPreviewZoomFitTarget(zoom, fit);
    zoom.fitRadius = Number(fit?.radius) || 8;
    zoom.fitCx = Number(fit?.cx) || 0;
    zoom.fitCy = Number(fit?.cy) || 0;
}

function _setPreviewZoomFitTarget(zoom, fit) {
    zoom.fitTargetRadius = Number(fit?.radius) || 8;
    zoom.fitTargetCx = Number(fit?.cx) || 0;
    zoom.fitTargetCy = Number(fit?.cy) || 0;
    if (!Number.isFinite(Number(zoom.fitRadius))) zoom.fitRadius = zoom.fitTargetRadius;
    if (!Number.isFinite(Number(zoom.fitCx))) zoom.fitCx = zoom.fitTargetCx;
    if (!Number.isFinite(Number(zoom.fitCy))) zoom.fitCy = zoom.fitTargetCy;
}

function _previewZoomNeedsAnimation(zoom) {
    if (Math.abs((Number(zoom?.target) || 0) - (Number(zoom?.level) || 0)) > CREATE_PREVIEW_ZOOM_STOP_EPS) {
        return true;
    }
    if (_previewFitTargetDistance(zoom) > CREATE_PREVIEW_ZOOM_STOP_EPS) return true;
    if (_previewDisplayBodyTargetDistance(zoom) > CREATE_PREVIEW_ZOOM_STOP_EPS) return true;
    return _previewNormalBodyTargetDistance(zoom) > CREATE_PREVIEW_ZOOM_STOP_EPS;
}

function _previewFitTargetDistance(zoom) {
    if (!Number.isFinite(Number(zoom?.fitTargetRadius))) return 0.0;
    return Math.max(
        Math.abs(Number(zoom.fitTargetRadius) - (Number(zoom.fitRadius) || 0)),
        Math.abs(Number(zoom.fitTargetCx) - (Number(zoom.fitCx) || 0)),
        Math.abs(Number(zoom.fitTargetCy) - (Number(zoom.fitCy) || 0))
    );
}

function _clearPreviewFitAfterNormalZoom(zoom) {
    if (zoom.lockedToFit || zoom.target !== 1.0 || zoom.level < 1.0 - CREATE_PREVIEW_ZOOM_STOP_EPS) return;
    zoom.fitRadius = null;
    zoom.fitCx = null;
    zoom.fitCy = null;
    zoom.fitTargetRadius = null;
    zoom.fitTargetCx = null;
    zoom.fitTargetCy = null;
}

function _animatePreviewZoom(kind) {
    const zoom = kind === "selected" ? _selectedPreviewZoom : _createPreviewZoom;
    if (zoom.animationId) return;
    let lastTime = performance.now();
    const draw = () => {
        if (kind === "selected") {
            const cell = state.cellById?.get?.(state.selectedCellId);
            if (cell) drawSelectedCellPreview(cell, state.selectedStrain);
        } else {
            drawCreateCellPreview();
        }
    };
    const step = now => {
        const dt = Math.min(34, Math.max(1, now - lastTime));
        lastTime = now;
        const alpha = 1 - Math.exp(-dt / CREATE_PREVIEW_ZOOM_TIME_CONSTANT_MS);
        zoom.level = _previewApproach(zoom.level, zoom.target, alpha);
        if (Number.isFinite(Number(zoom.fitTargetRadius))) {
            zoom.fitRadius = _previewApproach(zoom.fitRadius, zoom.fitTargetRadius, alpha);
            zoom.fitCx = _previewApproach(zoom.fitCx, zoom.fitTargetCx, alpha);
            zoom.fitCy = _previewApproach(zoom.fitCy, zoom.fitTargetCy, alpha);
        }
        if (Number.isFinite(Number(zoom.normalTargetBodyRadius))) {
            zoom.normalBodyRadius = _previewApproach(zoom.normalBodyRadius, zoom.normalTargetBodyRadius, alpha);
        }
        if (Number.isFinite(Number(zoom.displayTargetBodyRadius))) {
            zoom.displayBodyRadius = _previewApproach(zoom.displayBodyRadius, zoom.displayTargetBodyRadius, alpha);
        }

        const levelDone = Math.abs(zoom.target - zoom.level) <= CREATE_PREVIEW_ZOOM_STOP_EPS;
        const fitDone = _previewFitTargetDistance(zoom) <= CREATE_PREVIEW_ZOOM_STOP_EPS;
        const normalDone = _previewNormalBodyTargetDistance(zoom) <= CREATE_PREVIEW_ZOOM_STOP_EPS;
        const displayDone = _previewDisplayBodyTargetDistance(zoom) <= CREATE_PREVIEW_ZOOM_STOP_EPS;
        if (levelDone) zoom.level = zoom.target;
        if (fitDone && Number.isFinite(Number(zoom.fitTargetRadius))) {
            zoom.fitRadius = zoom.fitTargetRadius;
            zoom.fitCx = zoom.fitTargetCx;
            zoom.fitCy = zoom.fitTargetCy;
        }
        if (normalDone && Number.isFinite(Number(zoom.normalTargetBodyRadius))) {
            zoom.normalBodyRadius = zoom.normalTargetBodyRadius;
        }
        if (displayDone && Number.isFinite(Number(zoom.displayTargetBodyRadius))) {
            zoom.displayBodyRadius = zoom.displayTargetBodyRadius;
        }

        if (levelDone && fitDone && normalDone && displayDone) {
            zoom.animationId = 0;
            _clearPreviewFitAfterNormalZoom(zoom);
            draw();
            return;
        }

        draw();
        zoom.animationId = requestAnimationFrame(step);
    };
    zoom.animationId = requestAnimationFrame(step);
}


function _ensurePreviewAnimationLoop() {
    if (_previewAnimationLoopId || _previewAnimationLoopActive || !_shouldAnimateAnyPreview()) return;
    _previewAnimationLoopActive = true;
    if (!_previewAnimationClockStartMs) {
        _previewAnimationClockStartMs = performance.now();
        _previewAnimationFrameSeconds = 0;
    }

    const step = now => {
        _previewAnimationLoopId = 0;
        if (!_shouldAnimateAnyPreview()) {
            _previewAnimationLoopActive = false;
            _previewAnimationClockStartMs = 0;
            _previewAnimationFrameSeconds = 0;
            return;
        }
        _updatePreviewAnimationClock(now);

        let keepAnimating = false;
        if (_shouldAnimateSelectedPreview()) {
            const cell = state.cellById?.get?.(state.selectedCellId);
            if (cell) drawSelectedCellPreview(cell, state.selectedStrain);
            keepAnimating = true;
        }
        if (_shouldAnimateCreatePreview()) {
            drawCreateCellPreview();
            keepAnimating = true;
        }
        if (keepAnimating) {
            _previewAnimationLoopId = requestAnimationFrame(step);
        } else {
            _previewAnimationLoopActive = false;
            _previewAnimationClockStartMs = 0;
        }
    };
    _previewAnimationLoopId = requestAnimationFrame(step);
}

function _updatePreviewAnimationClock(now = performance.now()) {
    if (!_previewAnimationClockStartMs) {
        _previewAnimationClockStartMs = now;
        _previewAnimationFrameSeconds = 0;
        return;
    }
    // Advance the preview animation clock exactly once per animation frame.
    // Interaction redraws (hover, scroll, zoom) reuse this value instead of
    // sampling performance.now(), so they cannot speed up the flagellum phase.
    _previewAnimationFrameSeconds = ((now - _previewAnimationClockStartMs) / 1000.0) % 10000.0;
}

function _previewAnimationSeconds() {
    return _previewAnimationFrameSeconds;
}

function _shouldAnimateAnyPreview() {
    return _shouldAnimateSelectedPreview() || _shouldAnimateCreatePreview();
}

function _shouldAnimateSelectedPreview() {
    const cell = state.cellById?.get?.(state.selectedCellId);
    return Boolean(cell && !cell.dead && _hasActiveFlagellaForPreview(cell));
}

function _shouldAnimateCreatePreview() {
    return Boolean(state.cellDraft && _hasActiveFlagellaCilia(state.cellDraft.genome));
}

function _hasActiveFlagellaCilia(genome = {}) {
    return Boolean(genome?.flagellumEnabled)
        && Math.round(Number(genome?.flagellumCount ?? 0)) > 0
        && Number(genome?.flagellumMotorPower ?? 0) > 0;
}

function _hasActiveFlagellaForPreview(cell) {
    if (!cell) return false;
    if (_hasActiveFlagellaCilia(cell.genome ?? state.selectedStrain?.genome ?? {})) return true;
    if (previewFlagellumCount(state.selectedStrain?.genome ?? {}, cell) <= 0) return false;

    const slots = Array.isArray(cell.flagellumSlots) ? cell.flagellumSlots : [];
    if (slots.length === 0) return true;
    return slots.some(slot => {
        const motorPower = Number(slot?.motorPower ?? 0);
        const performance = Number(slot?.performance ?? 1);
        const damage = Number(slot?.damage ?? 0);
        return motorPower > 0 && performance > 0.001 && damage < 1.0;
    });
}

function previewFlagellumCount(genome = {}, cell = null) {
    if (Boolean(genome?.flagellumEnabled)) {
        const genomeCount = Math.max(0, Math.round(Number(genome?.flagellumCount ?? 0) || 0));
        if (genomeCount > 0) return genomeCount;
    }

    const visualCount = Math.max(0, Math.round(Number(cell?.visual?.flagellumCount ?? 0) || 0));
    const capacity = Math.max(0, Math.round(Number(cell?.flagellumCapacity ?? 0) || 0));
    const slotCount = Array.isArray(cell?.flagellumSlots) ? cell.flagellumSlots.length : 0;
    return Math.max(visualCount, capacity, slotCount);
}

function _flagellumLengthFactorFromGenome(genome = {}) {
    const raw = Number(genome?.flagellumLength ?? 1.8);
    if (!Number.isFinite(raw)) return 1.8;
    if (raw > 5) return 1.0 + (CREATE_PREVIEW_FLAGELLUM_MAX_LENGTH_FACTOR - 1.0) * _clamp01(raw / 100);
    return Math.max(1.0, Math.min(CREATE_PREVIEW_FLAGELLUM_MAX_LENGTH_FACTOR, raw));
}

function _smoothstep(t) {
    const v = _clamp01(t);
    return v * v * (3.0 - 2.0 * v);
}

function _syncSelectedPreviewNoticeIndicator(worldCell) {
    const badge = dom.selectedPreviewEventIndicator;
    if (!badge) return;

    const notice = _activeSelectedPreviewNotice(worldCell);
    badge.classList.toggle("hidden", !notice);
    badge.classList.remove("preview-mode-badge--event-dead", "preview-mode-badge--event-divided", "preview-mode-badge--event-energy-low");

    if (!notice) {
        badge.style.opacity = "";
        const text = badge.querySelector(".preview-mode-badge-text");
        if (text) text.textContent = "";
        return;
    }

    badge.classList.add(`preview-mode-badge--event-${notice.type}`);
    badge.style.opacity = String(_clamp01(notice.alpha ?? 1));
    const text = badge.querySelector(".preview-mode-badge-text");
    if (text) text.textContent = notice.label;
}

function _activeSelectedPreviewNotice(worldCell) {
    if (worldCell?.dead) {
        return {
            type: "dead",
            label: t("DEAD"),
            alpha: 1,
        };
    }

    if (Number(worldCell?.energyAvailability ?? 1) < 0.999) {
        return {
            type: "energy-low",
            label: t("LOW ENERGY"),
            alpha: 1,
        };
    }

    const notice = state.selectedPreviewNotice;
    if (!notice || notice.type !== "divided") return null;

    const currentTime = Number(state.world?.time);
    const startTime = Number(notice.startTime);
    if (!Number.isFinite(currentTime) || !Number.isFinite(startTime)) {
        return {
            type: "divided",
            label: t("DIVIDED"),
            alpha: 1,
        };
    }

    const holdTime = Number.isFinite(Number(notice.holdTime)) ? Number(notice.holdTime) : 1.0;
    const fadeTime = Number.isFinite(Number(notice.fadeTime)) ? Number(notice.fadeTime) : 0.5;
    const age = Math.max(0.0, currentTime - startTime);

    if (age >= holdTime + fadeTime) {
        state.selectedPreviewNotice = null;
        return null;
    }

    const fadeT = age <= holdTime ? 0 : _clamp01((age - holdTime) / Math.max(0.0001, fadeTime));
    const smoothFade = fadeT * fadeT * (3 - 2 * fadeT);

    return {
        type: "divided",
        label: t("DIVIDED"),
        alpha: 1 - smoothFade,
    };
}

function _previewCellRotation(worldCell) {
    if (!Number.isFinite(Number(worldCell?.directionAngle))) return 0;
    return Number(worldCell.directionAngle) * Math.PI / 180.0;
}

function _directionFromDto(x, y) {
    if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return null;
    if (Number(x) === 0 && Number(y) === 0) return null;
    return {x: Number(x), y: Number(y)};
}

function _eventAlpha(event) {
    const currentTime = state.world?.time;
    if (!Number.isFinite(currentTime) || !Number.isFinite(event.time)) return 1.0;
    const duration = Number.isFinite(event.duration) && event.duration > 0 ? event.duration : 1.0;
    const age = Math.max(0.0, currentTime - event.time);
    return Math.max(0.0, Math.min(1.0, 1.0 - age / duration));
}


function _previewIlluminance(worldCell) {
    if (!worldCell) return 1.0;
    const rawLight = Number(worldCell.localLight);
    const clampedLight = Number.isFinite(rawLight) ? _clamp01(rawLight) : 1.0;
    return PREVIEW_MIN_LIGHT + clampedLight * (1.0 - PREVIEW_MIN_LIGHT);
}

function _previewOldLowLightDimmingAlpha(worldCell, opacity = 1.0) {
    const darkness = 1.0 - _previewIlluminance(worldCell);
    if (darkness <= 0.001) return 0.0;
    return _clamp01(darkness * (0.66 + 0.16 * _previewAlpha(opacity)));
}

function _modulatePreviewRgb(color, illum) {
    const i = _clamp01(illum);
    const min = 24;
    return {
        r: Math.round(min + (Number(color?.r ?? 255) - min) * i),
        g: Math.round(min + (Number(color?.g ?? 255) - min) * i),
        b: Math.round(min + (Number(color?.b ?? 255) - min) * i),
        opacity: color?.opacity,
    };
}

function _applyDeadPreviewTint(ctx, cx, cy, radius) {
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0.00, "rgba(120, 72, 28, 0.14)");
    gradient.addColorStop(0.70, "rgba(120, 72, 28, 0.22)");
    gradient.addColorStop(1.00, "rgba(120, 72, 28, 0.34)");

    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function _drawPreviewOldLowLightDimming(ctx, radius, alpha) {
    const a = _clamp01(alpha);
    if (a <= 0.001) return;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgba(0, 0, 0, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function _modulatePreviewLightness(baseLightness, illuminance) {
    const minL = 5;
    return Math.round(minL + (baseLightness - minL) * _clamp01(illuminance));
}

function _fillHatchCircle(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.setLineDash([]);
    ctx.lineWidth = 1.55;

    for (let d = -r * 2; d <= r * 2; d += 5) {
        ctx.beginPath();
        ctx.moveTo(cx - r + d, cy + r);
        ctx.lineTo(cx + r + d, cy - r);
        ctx.stroke();
    }

    ctx.restore();
}

function _fillHatchCircleDown(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.setLineDash([]);
    ctx.lineWidth = 1.35;

    for (let d = -r * 2; d <= r * 2; d += 5) {
        ctx.beginPath();
        ctx.moveTo(cx - r + d, cy - r);
        ctx.lineTo(cx + r + d, cy + r);
        ctx.stroke();
    }

    ctx.restore();
}

function _fillHatchEllipseDown(ctx, x, y, sx, sy, rotation, color) {
    const span = Math.max(sx, sy);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.ellipse(0, 0, sx, sy, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.setLineDash([]);
    ctx.lineWidth = 1.25;

    for (let d = -span * 2.4; d <= span * 2.4; d += 4.5) {
        ctx.beginPath();
        ctx.moveTo(-span + d, -span);
        ctx.lineTo(span + d, span);
        ctx.stroke();
    }

    ctx.restore();
}

function _fillHatchCircleWithRadialFade(ctx, cx, cy, r, alpha = 1.0) {
    const a = _clamp01(alpha);
    if (a <= 0.001) return;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0.0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.52, "rgba(255,255,255,0)");
    gradient.addColorStop(0.76, `rgba(255,255,255,${(0.11 * a).toFixed(3)})`);
    gradient.addColorStop(1.0, `rgba(255,255,255,${(0.28 * a).toFixed(3)})`);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = gradient;
    ctx.setLineDash([]);
    ctx.lineWidth = 1.55;

    for (let d = -r * 2; d <= r * 2; d += 5) {
        ctx.beginPath();
        ctx.moveTo(cx - r + d, cy - r);
        ctx.lineTo(cx + r + d, cy + r);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx - r + d, cy + r);
        ctx.lineTo(cx + r + d, cy - r);
        ctx.stroke();
    }

    ctx.restore();
}

function _fillHatchRing(ctx, cx, cy, innerR, outerR, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.setLineDash([]);
    ctx.lineWidth = 1.55;

    for (let d = -outerR * 2; d <= outerR * 2; d += 5) {
        ctx.beginPath();
        ctx.moveTo(cx - outerR + d, cy + outerR);
        ctx.lineTo(cx + outerR + d, cy - outerR);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx - outerR + d, cy - outerR);
        ctx.lineTo(cx + outerR + d, cy + outerR);
        ctx.stroke();
    }

    ctx.restore();
}

function _previewOrganelleAlpha(realOpacity = 0.0, kind = "") {
    const opacity = _clamp01(realOpacity);
    if (opacity <= 0.001) return 0.0;
    if (kind === "chloroplast") return _clamp01(Math.max(0.34, opacity * 1.55));
    if (kind === "lysosome") return _clamp01(Math.max(0.36, opacity * 1.42));
    if (kind === "nucleoid") return _clamp01(Math.max(0.46, opacity * 1.18));
    return opacity;
}

function _diagnosticOrganelleAlpha(realOpacity = 0.0) {
    return _clamp01(realOpacity) <= 0.001 ? 0.0 : 1.0;
}

function _activePreviewScope(worldCell) {
    const scope = worldCell ? state.selectedInfoScope : state.createInfoScope;
    const normalized = String(scope ?? "general").toLowerCase();
    if (normalized === "nucleoid") return "nucleus";
    return normalized;
}

function _previewAlpha(realOpacity = 0.1) {
    const opacity = Number(realOpacity ?? 0.1);
    if (!Number.isFinite(opacity) || opacity <= 0.0) return 0.0;
    return _clamp01(opacity);
}

function _splitOpacity(opacity, share) {
    const a = _clamp01(opacity);
    const safeShare = Math.max(0.01, Math.min(1.0, share));
    return 1.0 - Math.pow(1.0 - a, safeShare);
}

function _mixRgb(from, to, t) {
    const x = _clamp01(t);
    return {
        r: Math.round(from.r + (to.r - from.r) * x),
        g: Math.round(from.g + (to.g - from.g) * x),
        b: Math.round(from.b + (to.b - from.b) * x),
    };
}

function _mixWeighted(a, aw, b, bw, c, cw) {
    const sum = Math.max(0.001, aw + bw + cw);
    return {r: Math.round((a.r * aw + b.r * bw + c.r * cw) / sum), g: Math.round((a.g * aw + b.g * bw + c.g * cw) / sum), b: Math.round((a.b * aw + b.b * bw + c.b * cw) / sum)};
}

function _mixWeighted4(a, aw, b, bw, c, cw, d, dw) {
    const sum = Math.max(0.001, aw + bw + cw + dw);
    return {r: Math.round((a.r * aw + b.r * bw + c.r * cw + d.r * dw) / sum), g: Math.round((a.g * aw + b.g * bw + c.g * cw + d.g * dw) / sum), b: Math.round((a.b * aw + b.b * bw + c.b * cw + d.b * dw) / sum)};
}

function _darkenRgb(color, amount) {
    return {r: Math.max(0, Math.round((color?.r ?? 255) - amount)), g: Math.max(0, Math.round((color?.g ?? 255) - amount)), b: Math.max(0, Math.round((color?.b ?? 255) - amount))};
}

function _lerpAngle(a, b, t) {
    return a + _angleDiff(b, a) * _clamp01(t);
}

function _angleDiff(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}


function _rgba(color, alpha = 1) {
    return `rgba(${Math.round(color?.r ?? 255)}, ${Math.round(color?.g ?? 255)}, ${Math.round(color?.b ?? 255)}, ${_clamp01(alpha).toFixed(3)})`;
}

function _fmt(value) {
    return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "0.00";
}

function _pct(value) {
    return `${Math.round(_clamp01(value) * 100)}%`;
}

function _cap(s) {
    const text = String(s ?? "");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function _clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

function _clamp01(value) {
    if (!Number.isFinite(Number(value))) return 0;
    return Math.max(0, Math.min(1, Number(value)));
}


