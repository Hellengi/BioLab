import { drawInternalBioluminescenceGlow } from "./bioluminescence.js";
import { ORGANIC_BROWN_COLOR } from "./colors.js";
import { clamp01, grayscaleRgb, hash01, organicBrownHsla, rgb, seededRandom, smoothstep } from "./render-utils.js";
import { buildSlotIndex, radialOrganelleLayouts } from "./organelle-layout.js";

const CELL_MIN_LIGHT = 0.38;
const DEFAULT_MEMBRANE_OPACITY = 0.095;
const DEFAULT_FLAGELLUM_MIN_SPACING_ANGLE = 20;

const COLORLESS_MEMBRANE_COLOR = Object.freeze({ r: 238, g: 240, b: 232 });

const FLAGELLUM_VISUAL = Object.freeze({
    pointCount: 22,
    rootStraightFraction: 0.16,
    rootBlendPointFraction: 0.20,
    minBlendPointIndex: 4,
    strokeAsymmetry: 0.18,
    rootWidthBoost: 1.10,
    widthExponent: 2.30,
    minTipWidthPx: 0.30,
    amplitudeBaseFraction: 0.19,
    amplitudeDriveFraction: 0.05,
    amplitudeDrivePower: 0.72,
    beatFrequencyBase: 2.0,
    beatFrequencyRange: 26.0,
    envelopeWaveCycles: 4.8,
    envelopeWaveCycleSpread: 1.25,
    rootBezierInPull: 0.58,
    rootBezierOutPull: 0.42,
    membraneLayerAlpha: 0.88,
    rootFlareWidthBoost: 2.35,
    rootFlareLengthFraction: 0.18,
    clipUnderlapPx: 0.6,
    rootInsetFactor: 0.16,
    rootInsetMaxWidthFactor: 1.25,
    minThicknessFactor: 0.050,
    maxThicknessFactor: 0.112,
    thicknessLengthPower: 0.82,
    pairThicknessScale: 0.92,
});

const CYTOSOL_TEXTURE = Object.freeze({
    worldGranules: 10,
    previewGranules: 14,
    alpha: 0.055,
    previewAlpha: 0.060,
    minRadius: 0.18,
    maxRadius: 0.52,
});

const ORGANELLE_VISIBILITY = Object.freeze({
    nucleoidMinAlpha: 0.46,
    nucleoidBoost: 1.18,
    chloroplastMinAlpha: 0.34,
    chloroplastBoost: 1.55,
    lysosomeMinAlpha: 0.36,
    lysosomeBoost: 1.42,
});

const FOOD_SHAPE = Object.freeze({
    pointCount: 13,
    radialJitter: 0.24,
    cacheLimit: 6000,
});

const FOOD_INNER_BODY = Object.freeze({
    scale: 0.52,
    mainAlpha: 0.92,
    innerAlpha: 0.88,
    darkeningFactor: 0.50,
});

const CELL_LIGHTING_DETAIL = Object.freeze({
    gradientScale: 6.15,
    maxHighlightAlpha: 0.88,
    highlightCoreAlpha: 0.62,
    maxShadowAlpha: 0.94,
    shadowEdgeAlpha: 0.68,
    shadowMidAlpha: 0.52,
    shadowReach: 0.72,
    lightingOpacityFloor: 0.68,
    cursorLightOpacityFloor: 0.78,
});

const DRAW_THRESHOLDS = Object.freeze({
    minBodyRadius: 0.15,
    minOrganelleRadius: 0.28,
    minTextureDotRadius: 0.16,
});

const FLAGELLUM_GEOMETRY_CACHE = Object.freeze({
    angleStep: 0.002,
    positionStep: 0.01,
    timeStep: 1 / 90,
});

// Caches the static anatomical part of cells. The cache intentionally does not
// include overlays that are expected to change every frame: light crescents,
// hover/selection hatching, hit-target generation and force arrows. A cached
// cell body can therefore be reused while the cell moves, while dynamic effects
// are still drawn live on top.
const STATIC_CELL_CACHE = Object.freeze({
    enabledByDefault: false,
    maxEntries: 768,
    radiusStep: 0.25,
    valueStep: 0.0025,
    lightStep: 0.01,
    renderScaleStep: 0.25,
    maxRenderScale: 4.0,
    padding: 6,
});

const staticCellBaseCache = new Map();
const foodPathCache = new Map();

export function drawBiologyCell(ctx, cell, options = {}) {
    if (!ctx || !cell) return;

    const visual = options.visual ?? cell.visual ?? {};
    const x = finiteNumber(options.x, cell.x ?? 0);
    const y = finiteNumber(options.y, cell.y ?? 0);
    const radius = finiteNumber(options.radius, cell.radius ?? 0);
    if (radius <= DRAW_THRESHOLDS.minBodyRadius) return;

    const sourceRadius = Math.max(1.0e-6, finiteNumber(options.sourceRadius, cell.radius ?? radius));
    const scale = radius / sourceRadius;
    const renderScale = renderCacheScale(options.renderScale ?? 1);
    const normalizedMode = String(options.mode ?? "general").toLowerCase();
    const diagnosticMode = normalizedMode === "health" || normalizedMode === "energy";
    const preview = Boolean(options.preview);
    const grayscale = Boolean(options.grayscale);

    const illum = Number.isFinite(Number(options.illuminance))
        ? clamp01(Number(options.illuminance))
        : (diagnosticMode ? 1.0 : cellIlluminance(cell, options.lighting));

    const layerCount = previewLayerCount(options.layerCount ?? 3);
    const organellesOnly = !diagnosticMode && layerCount === 1;
    const canSelectCytosol = !organellesOnly;
    const canSelectMembrane = !organellesOnly;
    const showCytosol = options.showCytosol !== false;
    const showOrganelles = options.showOrganelles !== false;
    const showMembrane = options.showMembrane !== false && (diagnosticMode || layerCount >= 2);
    const showShading = options.showShading !== false && !diagnosticMode && layerCount >= 3;
    const showBioluminescence = options.showBioluminescence !== false && !diagnosticMode;
    const showFlagella = options.showFlagella !== false && showOrganelles;

    const sourceCytosolColor = visual.cytosolColor ?? visual.cellColor;
    const sourceMembraneColor = visual.membraneColor;
    const sourceChloroplastColor = visual.chloroplastColor;
    const sourceLysosomeColor = visual.lysosomeColor;
    const sourceFlagellumColor = visual.flagellumColor;
    const sourceNucleoidColor = visual.nucleoidColor;

    const cytosolColor = colorForRender(sourceCytosolColor, illum, grayscale);
    const membraneColor = colorForRender(sourceMembraneColor, illum, grayscale);
    const chloroplastColor = colorForRender(sourceChloroplastColor, illum, grayscale);
    const lysosomeColor = colorForRender(sourceLysosomeColor, illum, grayscale);
    const flagellumColor = colorForRender(sourceFlagellumColor, illum, grayscale);
    const nucleoidColor = colorForRender(sourceNucleoidColor, illum, grayscale);

    const cytosolOpacity = layerAlpha(sourceCytosolColor?.opacity ?? visual.cellColor?.opacity ?? cell?.opacity ?? 0.1);
    const membraneOpacity = layerAlpha(sourceMembraneColor?.opacity ?? (preview ? DEFAULT_MEMBRANE_OPACITY : 0.0));
    const chloroplastOpacity = organelleAlpha(sourceChloroplastColor?.opacity ?? 0, "chloroplast", diagnosticMode);
    const lysosomeOpacity = organelleAlpha(sourceLysosomeColor?.opacity ?? 0, "lysosome", diagnosticMode);
    const flagellumOpacity = organelleAlpha(
        sourceFlagellumColor?.opacity
            ?? Math.max(sourceCytosolColor?.opacity ?? 0, sourceMembraneColor?.opacity ?? 0),
        "flagellum",
        diagnosticMode
    );
    const nucleoidOpacity = organelleAlpha(sourceNucleoidColor?.opacity ?? 0.62, "nucleoid", diagnosticMode);

    const labels = options.labels ?? {};
    const labelFor = typeof options.labelFor === "function" ? options.labelFor : id => labels[id] ?? defaultLabelFor(id);
    const tooltipFor = typeof options.tooltipFor === "function" ? options.tooltipFor : id => labelFor(id);
    const hitTargets = Array.isArray(options.hitTargets) ? options.hitTargets : null;
    const activeOrganelle = normalizeOrganelleId(options.activeOrganelle);
    const activeOrganelleAlpha = clamp01(options.activeOrganelleAlpha ?? 0.0);
    const cellTransform = buildCellLocalTransform(cell);

    const hasVisibleFlagella = showFlagella && Number(visual?.flagellumCount ?? (cell?.genome?.flagellumEnabled ? cell?.genome?.flagellumCount : 0) ?? 0) > 0;
    const flagellaGeometryCache = hasVisibleFlagella ? new Map() : null;

    const drawExternalFlagella = (flagellaLayerOptions = {}) => drawFlagella(ctx, {
        cell,
        visual,
        x,
        y,
        radius,
        sourceRadius,
        scale,
        color: flagellumColor,
        opacity: flagellumOpacity,
        amount: visual.flagellumCount ?? (cell?.genome?.flagellumEnabled ? cell?.genome?.flagellumCount : 0) ?? 0,
        hitTargets,
        active: activeOrganelle === "flagellum",
        activeAlpha: activeOrganelleAlpha,
        labelFor,
        tooltipFor,
        preview,
        renderScale,
        mode: normalizedMode,
        showMembrane,
        showShading,
        illum,
        grayscale,
        animationTime: Number.isFinite(Number(options.animationTime)) ? Number(options.animationTime) : 0,
        visibleBounds: options.visibleBounds ?? null,
        geometryCache: flagellaGeometryCache,
        ...flagellaLayerOptions,
    });

    if (shouldUseStaticCellBaseCache({
        options,
        hitTargets,
        activeOrganelle,
        activeOrganelleAlpha,
        radius,
        showCytosol,
        showBioluminescence,
        showOrganelles,
        showMembrane,
        diagnosticMode,
    })) {
        const cached = cachedStaticCellBase(ctx, cell, options, {
            visual,
            x,
            y,
            radius,
            sourceRadius,
            renderScale,
            normalizedMode,
            diagnosticMode,
            preview,
            grayscale,
            illum,
            layerCount,
            showCytosol,
            showBioluminescence,
            showOrganelles,
            showMembrane,
            cytosolOpacity,
            membraneOpacity,
            chloroplastOpacity,
            lysosomeOpacity,
            flagellumOpacity,
            nucleoidOpacity,
            showFlagella: false,
        });

        if (cached) {
            if (hasVisibleFlagella && !diagnosticMode) {
                drawExternalFlagella({
                    drawCytosolLayer: true,
                    drawMembraneLayer: false,
                    drawEffects: false,
                });
            }
            drawCachedStaticCellBase(ctx, cached, x, y, cellTransform.angle);
            if (showOrganelles && normalizedMode === "general") {
                drawNucleoidDynamicShadow(ctx, {
                    cell,
                    visual,
                    x,
                    y,
                    radius,
                    scale,
                    opacity: nucleoidOpacity,
                    cellTransform,
                });
            }
            if (hasVisibleFlagella) {
                drawExternalFlagella({
                    drawCytosolLayer: diagnosticMode,
                    drawMembraneLayer: diagnosticMode ? false : showMembrane,
                    drawEffects: true,
                });
            }
            if (showShading) {
                drawCellLightCrescents(ctx, {
                    x,
                    y,
                    radius,
                    visual,
                    cursorLight: options.cursorLight ?? null,
                    cellOpacity: layerAlpha(visual.cellColor?.opacity ?? cell?.opacity ?? sourceCytosolColor?.opacity ?? 0.1),
                });
            }
            return;
        }
    }

    if (hitTargets && canSelectCytosol) {
        hitTargets.push({
            type: "circle",
            kind: "organelle",
            id: "cytosol",
            label: labelFor("cytosol"),
            tooltip: tooltipFor("cytosol"),
            x,
            y,
            radius,
        });
    }

    if (hitTargets && canSelectMembrane) {
        hitTargets.push({
            type: "ring",
            kind: "organelle",
            id: "membrane",
            label: labelFor("membrane"),
            tooltip: tooltipFor("membrane"),
            x,
            y,
            inner: radius * 0.78,
            outer: radius + 5,
        });
    }

    if (hasVisibleFlagella && !diagnosticMode) {
        drawExternalFlagella({
            drawCytosolLayer: true,
            drawMembraneLayer: false,
            drawEffects: false,
        });
    }

    if (showCytosol) {
        fillSolidCircle(ctx, x, y, radius, cytosolColor, cytosolOpacity);
        if (!diagnosticMode) {
            drawCytosolTexture(ctx, x, y, radius, cytosolColor, cytosolOpacity, seedFor(cell, visual, preview), preview);
        }
    }

    if (showBioluminescence) {
        drawInternalBioluminescenceGlow(ctx, {
            x,
            y,
            radius,
            color: visual.bioluminescenceColor ?? {r: 83, g: 255, b: 139},
            expression: visual.bioluminescenceExpression ?? normalizedBioluminescence(cell),
            baseAlpha: cytosolOpacity,
            rgba: rgb,
        });
    }

    if (showOrganelles) {
        drawNucleoid(ctx, {
            cell,
            visual,
            x,
            y,
            radius,
            sourceRadius,
            scale,
            color: nucleoidColor,
            opacity: nucleoidOpacity,
            hitTargets,
            active: activeOrganelle === "nucleus" || activeOrganelle === "nucleoid",
            activeAlpha: activeOrganelleAlpha,
            labelFor,
            tooltipFor,
            decorative: normalizedMode === "general" && options.showOrganelleShadows !== false,
            cellTransform,
        });
        drawLysosomes(ctx, {
            cell,
            visual,
            x,
            y,
            radius,
            sourceRadius,
            scale,
            color: lysosomeColor,
            opacity: lysosomeOpacity,
            amount: visual.lysosomeAmount ?? 0,
            capturedFoods: options.capturedFoods ?? null,
            hitTargets,
            active: activeOrganelle === "lysosome",
            activeAlpha: activeOrganelleAlpha,
            labelFor,
            tooltipFor,
            mode: normalizedMode,
            illum,
            preview,
            cellTransform,
        });
        drawChloroplasts(ctx, {
            cell,
            visual,
            x,
            y,
            radius,
            color: chloroplastColor,
            opacity: chloroplastOpacity,
            amount: visual.chloroplastAmount ?? 0,
            hitTargets,
            active: activeOrganelle === "chloroplast",
            activeAlpha: activeOrganelleAlpha,
            labelFor,
            tooltipFor,
            cellTransform,
        });
    }

    if (canSelectCytosol && activeOrganelle === "cytosol" && activeOrganelleAlpha > 0.001) {
        drawCytosolHoverFill(ctx, x, y, radius, activeOrganelleAlpha);
    }

    if (showMembrane) {
        if (canSelectMembrane && activeOrganelle === "membrane" && activeOrganelleAlpha > 0.001) {
            drawMembraneHoverFill(ctx, x, y, radius, activeOrganelleAlpha);
        }
        drawMembraneOverlay(ctx, x, y, radius, membraneColor, membraneOpacity, preview);
    }

    if (hasVisibleFlagella) {
        drawExternalFlagella({
            drawCytosolLayer: diagnosticMode,
            drawMembraneLayer: diagnosticMode ? false : showMembrane,
            drawEffects: true,
        });
    }

    if (showShading) {
        drawCellLightCrescents(ctx, {
            x,
            y,
            radius,
            visual,
            cursorLight: options.cursorLight ?? null,
            cellOpacity: layerAlpha(visual.cellColor?.opacity ?? cell?.opacity ?? sourceCytosolColor?.opacity ?? 0.1),
        });
    }

    if (canSelectCytosol && activeOrganelle === "cytosol" && activeOrganelleAlpha > 0.001) {
        drawCytosolHoverOutline(ctx, x, y, radius, activeOrganelleAlpha);
    }
    if (canSelectMembrane && activeOrganelle === "membrane" && activeOrganelleAlpha > 0.001) {
        drawMembraneHoverOutline(ctx, x, y, radius, activeOrganelleAlpha);
    }
}



function shouldUseStaticCellBaseCache(params) {
    const {
        options,
        hitTargets,
        activeOrganelle,
        activeOrganelleAlpha,
        radius,
        showCytosol,
        showBioluminescence,
        showOrganelles,
        showMembrane,
        diagnosticMode,
    } = params;

    const requested = options.cacheStaticBase ?? STATIC_CELL_CACHE.enabledByDefault;
    if (!requested) return false;
    if (diagnosticMode) return false;
    if (hitTargets) return false;
    if (activeOrganelle || activeOrganelleAlpha > 0.001) return false;
    if (options.cursorLight) return false;
    if (radius <= DRAW_THRESHOLDS.minBodyRadius) return false;
    if (!showCytosol && !showBioluminescence && !showOrganelles && !showMembrane) return false;
    return true;
}

function cachedStaticCellBase(ctx, cell, options, meta) {
    const cacheMeta = {...meta, showFlagella: false, flagellumOpacity: 0};
    const key = staticCellBaseCacheKey(cell, options, cacheMeta);
    const cached = staticCellBaseCache.get(key);
    if (cached) {
        // Refresh insertion order so the oldest truly unused entries are evicted first.
        staticCellBaseCache.delete(key);
        staticCellBaseCache.set(key, cached);
        return cached;
    }

    const renderScale = renderCacheScale(cacheMeta.renderScale);
    const paddingWorld = Math.max(STATIC_CELL_CACHE.padding, cacheMeta.radius * 0.10);
    const sizeWorld = Math.max(1.0e-6, cacheMeta.radius * 2 + paddingWorld * 2);
    const sizePx = Math.max(1, Math.ceil(sizeWorld * renderScale));
    const canvas = createCellRenderCanvas(sizePx, sizePx);
    if (!canvas) return null;
    const cacheCtx = canvas.getContext("2d");
    if (!cacheCtx) return null;

    cacheCtx.setTransform(1, 0, 0, 1, 0, 0);
    cacheCtx.clearRect(0, 0, sizePx, sizePx);
    cacheCtx.setTransform(renderScale, 0, 0, renderScale, 0, 0);

    const center = sizeWorld * 0.5;
    const localCell = { ...cell, directionAngle: 0 };
    drawBiologyCell(cacheCtx, localCell, {
        ...options,
        x: center,
        y: center,
        radius: cacheMeta.radius,
        sourceRadius: cacheMeta.sourceRadius,
        visual: cacheMeta.visual,
        cacheStaticBase: false,
        showFlagella: false,
        hitTargets: null,
        activeOrganelle: null,
        activeOrganelleAlpha: 0,
        cursorLight: null,
        showShading: false,
        showOrganelleShadows: false,
        renderScale: 1,
    });

    const entry = {canvas, center, sizeWorld};
    staticCellBaseCache.set(key, entry);
    trimMapCache(staticCellBaseCache, STATIC_CELL_CACHE.maxEntries);
    return entry;
}

function drawCachedStaticCellBase(ctx, cached, x, y, rotation = 0) {
    if (!cached?.canvas) return;

    ctx.save();
    ctx.translate(x, y);
    if (Number.isFinite(rotation) && Math.abs(rotation) > 1.0e-9) {
        ctx.rotate(rotation);
    }
    ctx.drawImage(
        cached.canvas,
        -cached.center,
        -cached.center,
        cached.sizeWorld,
        cached.sizeWorld
    );
    ctx.restore();
}

function drawNucleoidDynamicShadow(ctx, params) {
    const {cell, visual, x, y, radius, scale, opacity, cellTransform} = params;
    const r = Number(cell?.nucleusRadius ?? 0) > 0 ? Number(cell.nucleusRadius) * scale : radius * 0.28;
    if (!Number.isFinite(r) || r <= DRAW_THRESHOLDS.minOrganelleRadius || opacity <= 0.001) return;

    const offset = rotateCellLocalOffset(
        (Number(cell?.nucleusOffsetX ?? 0) || 0) * scale,
        (Number(cell?.nucleusOffsetY ?? 0) || 0) * scale,
        cell,
        cellTransform
    );
    drawOrganelleExternalShadow(ctx, x + offset.x, y + offset.y, r, visual ?? cell?.visual, clamp01(opacity) * 0.92);
}

function renderCacheScale(value) {
    const scale = Number(value);
    if (!Number.isFinite(scale) || scale <= 1.0) return 1.0;
    const clamped = Math.min(STATIC_CELL_CACHE.maxRenderScale, scale);
    return q(clamped, STATIC_CELL_CACHE.renderScaleStep);
}

function createCellRenderCanvas(width, height) {
    if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(width, height);
    }
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }
    return null;
}

function staticCellBaseCacheKey(cell, options, meta) {
    const visual = meta.visual ?? {};
    return [
        "v4",
        cell?.id ?? "draft",
        meta.normalizedMode,
        meta.preview ? 1 : 0,
        meta.grayscale ? 1 : 0,
        meta.layerCount,
        q(meta.radius, STATIC_CELL_CACHE.radiusStep),
        q(meta.sourceRadius, STATIC_CELL_CACHE.radiusStep),
        q(meta.renderScale, STATIC_CELL_CACHE.renderScaleStep),
        q(meta.illum, STATIC_CELL_CACHE.lightStep),
        bool(meta.showCytosol),
        bool(meta.showBioluminescence),
        bool(meta.showOrganelles),
        bool(meta.showMembrane),
        q(meta.cytosolOpacity),
        q(meta.membraneOpacity),
        q(meta.chloroplastOpacity),
        q(meta.lysosomeOpacity),
        q(meta.showFlagella ? meta.flagellumOpacity ?? 0 : 0),
        q(meta.nucleoidOpacity),
        colorSignature(visual.cellColor),
        colorSignature(visual.cytosolColor),
        colorSignature(visual.membraneColor),
        colorSignature(visual.chloroplastColor),
        colorSignature(visual.lysosomeColor),
        colorSignature(meta.showFlagella ? visual.flagellumColor : null),
        colorSignature(visual.nucleoidColor),
        colorSignature(visual.bioluminescenceColor),
        q(visual.bioluminescenceExpression ?? normalizedBioluminescence(cell)),
        q(visual.chloroplastAmount ?? 0),
        q(visual.lysosomeAmount ?? 0),
        q(meta.showFlagella ? visual.flagellumCount ?? 0 : 0),
        meta.showFlagella ? flagellumSlotSignature(cell) : "-",
        q(cell?.nucleusRadius ?? 0),
        q(cell?.nucleusOffsetX ?? 0),
        q(cell?.nucleusOffsetY ?? 0),
        lysosomeSlotSignature(cell),
        capturedFoodSignature(options.capturedFoods, cell),
    ].join("|");
}

function colorSignature(color) {
    if (!color) return "-";
    return [
        q(color.r),
        q(color.g),
        q(color.b),
        q(color.opacity),
    ].join(",");
}

function flagellumSlotSignature(cell) {
    const slots = Array.isArray(cell?.flagellumSlots) ? cell.flagellumSlots : [];
    if (!slots.length) return "-";
    let result = "";
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        result += `${slot.index ?? i}:${q(slot.damage ?? 0)}:${q(slot.performance ?? 0)}:${q(slot.motorPower ?? 0)}:${q(slot.force ?? 0)}:${q(slot.baseX ?? 0)}:${q(slot.baseY ?? 0)}:${q(slot.directionX ?? 0)}:${q(slot.directionY ?? 0)}:${q(slot.length ?? 0)}:${q(slot.thickness ?? 0)}|`;
    }
    return result;
}

function lysosomeSlotSignature(cell) {
    const slots = Array.isArray(cell?.lysosomeSlots) ? cell.lysosomeSlots : [];
    if (!slots.length) return "-";
    let result = "";
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        result += `${Math.round(Number(slot?.index ?? i))}:${q(slot?.x ?? 0)}:${q(slot?.y ?? 0)}:${q(slot?.radius ?? 0)}:${q(slot?.targetX ?? 0)}:${q(slot?.targetY ?? 0)}:${q(slot?.targetRadius ?? 0)}:${q(slot?.foodRadius ?? 0)}:${q(slot?.targetFoodRadius ?? 0)}:${q(slot?.damage ?? 0)}:${slot?.foodId ?? "-"};`;
    }
    return result;
}

function capturedFoodSignature(capturedFoods, cell) {
    if (!capturedFoods || !cell?.id) return "-";
    const cellId = Number(cell.id);
    if (!Number.isFinite(cellId)) return "-";

    let result = "";
    if (capturedFoods instanceof Map) {
        const nested = capturedFoods.get(cell.id) ?? capturedFoods.get(cellId);
        if (nested instanceof Map) {
            for (const [slotIndex, food] of nested) {
                result += `${slotIndex}:${capturedFoodKey(food)};`;
            }
            return result || "-";
        }

        const prefix = `${cellId}:`;
        for (const [key, food] of capturedFoods) {
            if (String(key).startsWith(prefix)) {
                result += `${String(key).slice(prefix.length)}:${capturedFoodKey(food)};`;
            }
        }
        return result || "-";
    }

    const cellFoods = capturedFoods[cell.id] ?? capturedFoods[cellId];
    if (!(cellFoods instanceof Map) || cellFoods.size === 0) return "-";
    for (const [slotIndex, food] of cellFoods) {
        result += `${slotIndex}:${capturedFoodKey(food)};`;
    }
    return result || "-";
}

function capturedFoodKey(food) {
    return `${food?.id ?? "-"}:${q(food?.radius ?? 0)}:${q(food?.energy ?? 0)}:${bool(food?.insideLysosome)}:${q(food?.x ?? 0)}:${q(food?.y ?? 0)}`;
}

function q(value, step = STATIC_CELL_CACHE.valueStep) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round(number / step) * step;
}

function bool(value) {
    return value ? 1 : 0;
}

function trimMapCache(map, limit) {
    while (map.size > limit) {
        const firstKey = map.keys().next().value;
        if (firstKey === undefined) return;
        map.delete(firstKey);
    }
}


function organelleWorldPoint(cellX, cellY, localX, localY, transform) {
    const rotated = rotateOffset(localX, localY, transform);
    return {x: cellX + rotated.x, y: cellY + rotated.y};
}

function pushOrganelleHitTarget(hitTargets, params) {
    if (!hitTargets) return;
    const {id, index, labelFor, tooltipFor, x, y, radius} = params;
    hitTargets.push({
        type: "circle",
        kind: "organelle",
        id,
        ...(index == null ? {} : {index}),
        label: labelFor(id),
        tooltip: tooltipFor(id),
        x,
        y,
        radius,
    });
}

function drawActiveCircleOverlay(ctx, x, y, radius, activeAlpha, hatchAlpha = 0.20) {
    if (activeAlpha <= 0.001) return;
    ctx.globalAlpha = 1.0;
    fillHatchCircleDown(ctx, x, y, radius, `rgba(255,255,255,${(hatchAlpha * activeAlpha).toFixed(3)})`);
    ctx.strokeStyle = `rgba(255,255,255,${(0.90 * activeAlpha).toFixed(3)})`;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
}

function drawActiveEllipseOverlay(ctx, x, y, radiusX, radiusY, rotation, activeAlpha, hatchAlpha = 0.18) {
    if (activeAlpha <= 0.001) return;
    fillHatchEllipseDown(ctx, x, y, radiusX, radiusY, rotation, `rgba(255,255,255,${(hatchAlpha * activeAlpha).toFixed(3)})`);
    ctx.strokeStyle = `rgba(255,255,255,${(0.90 * activeAlpha).toFixed(3)})`;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    ctx.stroke();
}

function drawNucleoid(ctx, params) {
    const {cell, visual, x, y, radius, scale, color, opacity, hitTargets, active, activeAlpha, labelFor, tooltipFor, decorative, cellTransform} = params;
    const r = Number(cell?.nucleusRadius ?? 0) > 0 ? Number(cell.nucleusRadius) * scale : radius * 0.28;
    if (!Number.isFinite(r) || r <= DRAW_THRESHOLDS.minOrganelleRadius || opacity <= 0.001) return;

    const transform = cellTransform ?? buildCellLocalTransform(cell);
    const point = organelleWorldPoint(
        x,
        y,
        (Number(cell?.nucleusOffsetX ?? 0) || 0) * scale,
        (Number(cell?.nucleusOffsetY ?? 0) || 0) * scale,
        transform
    );
    const nx = point.x;
    const ny = point.y;
    const alpha = clamp01(opacity) * (active ? 1.0 : 0.92);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = rgb(color ?? {r:82,g:72,b:150}, 1);
    ctx.beginPath();
    ctx.arc(nx, ny, r, 0, Math.PI * 2);
    ctx.fill();
    if (decorative) {
        drawOrganelleExternalShadow(ctx, nx, ny, r, visual ?? cell?.visual, alpha);
    }
    if (active) drawActiveCircleOverlay(ctx, nx, ny, r, activeAlpha);
    ctx.restore();

    pushOrganelleHitTarget(hitTargets, {id: "nucleus", labelFor, tooltipFor, x: nx, y: ny, radius: r + 4});
}

function drawChloroplasts(ctx, params) {
    const {cell, x, y, radius, color, opacity, amount, hitTargets, active, activeAlpha, labelFor, tooltipFor, cellTransform} = params;
    const count = Math.max(0, Math.round(amount ?? 0));
    const visibleCount = Math.min(count, 24);
    const organelleRadius = radius * 0.11;
    if (visibleCount <= 0 || opacity <= 0.001 || organelleRadius <= DRAW_THRESHOLDS.minOrganelleRadius) return;

    const seed = seedFor(cell, {chloroplastAmount: count}, false, count * 97 + 17);
    const fillColor = color ?? {r:170,g:174,b:126};
    const transform = cellTransform ?? buildCellLocalTransform(cell);

    ctx.save();
    ctx.fillStyle = rgb(fillColor, opacity);
    ctx.strokeStyle = rgb(darkenRgb(fillColor, 34), opacity * 0.55);
    ctx.lineWidth = Math.max(0.25, Math.min(0.55, radius * 0.01));

    for (let i = 0; i < visibleCount; i++) {
        const layout = chloroplastLayout(seed, i, radius, visibleCount);
        const point = organelleWorldPoint(x, y, layout.x, layout.y, transform);
        const px = point.x;
        const py = point.y;
        const sx = organelleRadius * 1.34;
        const sy = organelleRadius * layout.normalScale;
        const rotation = layout.rotation + transform.angle;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, sx, sy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (active) {
            drawActiveEllipseOverlay(ctx, 0, 0, sx, sy, 0, activeAlpha);
            ctx.strokeStyle = rgb(darkenRgb(fillColor, 34), opacity * 0.55);
            ctx.lineWidth = Math.max(0.25, Math.min(0.55, radius * 0.01));
        }
        ctx.restore();

        pushOrganelleHitTarget(hitTargets, {id: "chloroplast", index: i, labelFor, tooltipFor, x: px, y: py, radius: Math.max(4, sx)});
    }

    ctx.restore();
}

function drawLysosomes(ctx, params) {
    const {cell, x, y, radius, scale, color, opacity, amount, capturedFoods, hitTargets, active, activeAlpha, labelFor, tooltipFor, mode, illum, preview, cellTransform} = params;
    const count = Math.max(0, Math.round(amount ?? 0));
    const visibleCount = Math.min(count, 6);
    if (visibleCount <= 0 || opacity <= 0.001) return;

    const seed = seedFor(cell, {lysosomeAmount: count}, false, count * 131 + 23);
    const fillColor = color ?? {r:180,g:36,b:38};
    const slots = Array.isArray(cell?.lysosomeSlots) ? cell.lysosomeSlots : [];
    const slotIndex = buildSlotIndex(slots);
    const normalizedMode = String(mode ?? "general").toLowerCase();
    const shouldDrawCapturedFood = normalizedMode !== "health";
    const transform = cellTransform ?? buildCellLocalTransform(cell);
    let fallbackLayouts = null;

    ctx.save();
    for (let i = 0; i < visibleCount; i++) {
        const slot = slotIndex.get(i) ?? null;
        let layout = lysosomeLayoutFromSlot(slot, scale);
        if (!layout) {
            fallbackLayouts ??= lysosomeLayouts(seed, visibleCount, radius, slots, scale);
            layout = fallbackLayouts[i];
        }
        layout ??= {x: 0, y: 0, r: radius * 0.12, rotation: 0};
        if (!Number.isFinite(layout.r) || layout.r <= DRAW_THRESHOLDS.minOrganelleRadius) continue;

        const point = organelleWorldPoint(x, y, layout.x, layout.y, transform);
        const px = point.x;
        const py = point.y;
        const r = layout.r;
        const layoutRotation = layout.rotation + transform.angle;

        if (normalizedMode === "general") {
            fillLysosomeRadial(ctx, px, py, r, layoutRotation, fillColor, opacity * (active ? 1.0 : 0.88));
        } else {
            fillEllipse(ctx, px, py, r * 1.05, r * 0.92, layoutRotation, fillColor, opacity * (active ? 1.0 : 0.88));
        }

        ctx.strokeStyle = rgb(darkenRgb(fillColor, 26), opacity * 0.62);
        ctx.lineWidth = Math.max(0.25, Math.min(0.55, radius * 0.01));
        ctx.beginPath();
        ctx.ellipse(px, py, r * 1.05, r * 0.92, layoutRotation, 0, Math.PI * 2);
        ctx.stroke();
        if (active) drawActiveEllipseOverlay(ctx, px, py, r * 1.05, r * 0.92, layoutRotation, activeAlpha);

        if (shouldDrawCapturedFood && slot?.occupied) {
            const capturedFood = capturedFoodForSlot(cell, capturedFoods, i);
            const rawFoodRadius = Number(capturedFood?.radius ?? slot?.foodRadius ?? 0) || 0;
            const foodRadius = capturedFood ? rawFoodRadius * scale : rawFoodRadius * scale;
            if (foodRadius > DRAW_THRESHOLDS.minOrganelleRadius) {
                const foodPosition = capturedFoodPosition(capturedFood, cell, x, y, scale, px, py, foodRadius);
                drawCapturedFood(ctx, slot, capturedFood, foodPosition, normalizedMode, illum, preview);
            }
        }

        pushOrganelleHitTarget(hitTargets, {id: "lysosome", index: i, labelFor, tooltipFor, x: px, y: py, radius: Math.max(4, r * 1.8)});
    }
    ctx.restore();
}


function drawFlagella(ctx, params) {
    const {
        cell,
        visual = {},
        x,
        y,
        radius,
        color,
        opacity,
        amount,
        hitTargets,
        active,
        activeAlpha,
        labelFor,
        tooltipFor,
        renderScale = 1,
        mode = "general",
        showMembrane = true,
        showShading = false,
        illum = 1.0,
        grayscale = false,
        drawCytosolLayer = true,
        drawMembraneLayer = showMembrane,
        drawEffects = true,
    } = params;
    const count = Math.max(0, Math.min(64, Math.round(amount ?? 0)));
    if (count <= 0 || opacity <= 0.001 || radius <= DRAW_THRESHOLDS.minBodyRadius) return;

    const diagnosticMode = mode === "health" || mode === "energy";
    const cytosolColor = colorForRender(visual.cytosolColor ?? visual.cellColor ?? color, diagnosticMode ? 1.0 : illum, grayscale);
    const membraneColor = colorForRender(visual.membraneColor ?? COLORLESS_MEMBRANE_COLOR, diagnosticMode ? 1.0 : illum, grayscale);
    const diagnosticColor = color ?? membraneColor ?? COLORLESS_MEMBRANE_COLOR;
    const cytosolLayerAlpha = layerAlpha(visual.cytosolColor?.opacity ?? visual.cellColor?.opacity ?? cell?.opacity ?? 0.1);
    const membraneLayerAlpha = showMembrane ? 1.0 : 0;
    const screenScale = Math.max(1.0, Number(renderScale) || 1.0);
    const geometry = flagellumGeometryForRender(params, count, screenScale);
    if (geometry.length === 0) return;

    ctx.save();
    ctx.lineCap = "butt";
    ctx.lineJoin = "round";

    for (const item of geometry) {
        const effectiveFlagellumAlpha = clamp01(item.visibleAlpha * opacity);

        if (diagnosticMode) {
            if (drawCytosolLayer || drawMembraneLayer) {
                ctx.fillStyle = rgb(diagnosticColor, effectiveFlagellumAlpha);
                fillFlagellumPath(ctx, item.bodyPath);
            }
        } else {
            if (effectiveFlagellumAlpha > 0.001) {
                if (drawCytosolLayer) {
                    ctx.save();
                    clipOutsideCell(ctx, x, y, item.clipRadius);
                    ctx.fillStyle = rgb(cytosolColor, clamp01(cytosolLayerAlpha * effectiveFlagellumAlpha));
                    fillFlagellumPath(ctx, item.bodyPath);
                    ctx.restore();
                }
                if (drawMembraneLayer && showMembrane) {
                    ctx.save();
                    clipOutsideCell(ctx, x, y, item.clipRadius);
                    ctx.fillStyle = rgb(membraneColor, clamp01(membraneLayerAlpha * effectiveFlagellumAlpha));
                    fillFlagellumPath(ctx, item.bodyPath);
                    ctx.restore();
                }
            }
            if (drawEffects && showShading) {
                drawFlagellumShadowLayer(ctx, item.bodyPath, x, y, radius, visual, item.visibleAlpha, Math.max(cytosolLayerAlpha, membraneLayerAlpha) * effectiveFlagellumAlpha);
            }
            if (drawEffects && cell?.dead) {
                drawDeadFlagellumFilterLayer(ctx, item.bodyPath, cell, illum, grayscale);
            }
        }

        if (drawEffects && active && activeAlpha > 0.001) {
            ctx.save();
            ctx.strokeStyle = `rgba(255,255,255,${(0.90 * activeAlpha).toFixed(3)})`;
            ctx.lineWidth = 1.15 / screenScale;
            ctx.stroke(item.bodyPath);
            ctx.restore();
        }

        if (drawEffects) hitTargets?.push({
            type: "segment",
            kind: "organelle",
            id: "flagellum",
            index: item.slot.index ?? 0,
            label: labelFor("flagellum"),
            tooltip: tooltipFor("flagellum"),
            x1: item.bx,
            y1: item.by,
            x2: item.bx + item.tailX * item.length,
            y2: item.by + item.tailY * item.length,
            hitRadius: Math.max(4, item.rootWidth * 1.6),
        });
    }

    ctx.restore();
}

function flagellumGeometryForRender(params, count, screenScale) {
    const geometryCache = params.geometryCache;
    const key = geometryCache ? flagellumGeometryCacheKey(params, count, screenScale) : null;
    if (key && geometryCache.has(key)) {
        return geometryCache.get(key);
    }

    const geometry = buildFlagellumGeometry(params, count, screenScale);
    if (key) {
        geometryCache.set(key, geometry);
    }
    return geometry;
}

function buildFlagellumGeometry(params, count, screenScale) {
    const {
        cell,
        x,
        y,
        radius,
        scale,
        animationTime = 0,
        visibleBounds = null,
    } = params;
    const slots = flagellumSlotsForRender(cell, count, radius, scale);
    const geometry = [];

    for (const slot of slots) {
        const damage = clamp01(slot.damage ?? 0);
        const forceScale = flagellumSlotForceScale(slot, cell, radius);
        const functionalDrive = forceScale;
        const visibleAlpha = clamp01(1.0 - damage * 0.18);
        if (visibleAlpha <= 0.001) continue;

        const bx = x + slot.baseX;
        const by = y + slot.baseY;
        const thrustX = Number(slot.directionX) || 0;
        const thrustY = Number(slot.directionY) || -1;
        const len = Math.hypot(thrustX, thrustY) || 1;
        const tailX = -thrustX / len;
        const tailY = -thrustY / len;
        const normalX = -tailY;
        const normalY = tailX;
        const length = Math.max(radius * 0.08, Number(slot.length) || radius * flagellumLengthFactorFromGenome(cell?.genome));
        const baseThickness = Math.max(1.2 / screenScale, Number(slot.thickness) || radius * flagellumThicknessFactorFromGenome(cell?.genome, count));
        const strokeAsymmetry = FLAGELLUM_VISUAL.strokeAsymmetry;
        const lengthRatio = Math.max(0.08, length / Math.max(radius, 1.0e-6));
        const thicknessRatio = Math.max(0.01, baseThickness / Math.max(radius, 1.0e-6));
        const beatDrive = Math.sqrt(clamp01(forceScale));
        const beatFrequency = forceScale <= 0.001
            ? 0
            : (FLAGELLUM_VISUAL.beatFrequencyBase + beatDrive * FLAGELLUM_VISUAL.beatFrequencyRange)
                * (0.25 + 0.75 * forceScale)
                / Math.sqrt(lengthRatio)
                / Math.sqrt(Math.max(0.32, thicknessRatio / 0.08));
        const phase = Number(animationTime || 0) * beatFrequency
            + (slot.index ?? 0) * (0.52 + 1.45 * strokeAsymmetry);
        const ampBase = Math.max(0.9 / screenScale, length * FLAGELLUM_VISUAL.amplitudeBaseFraction);
        const amp = ampBase
            * Math.pow(forceScale, FLAGELLUM_VISUAL.amplitudeDrivePower)
            * (0.24 + 0.76 * beatDrive)
            * (0.86 + FLAGELLUM_VISUAL.amplitudeDriveFraction * functionalDrive);
        const rootWidth = baseThickness * FLAGELLUM_VISUAL.rootWidthBoost;
        const tipWidth = Math.max(FLAGELLUM_VISUAL.minTipWidthPx / screenScale, baseThickness * 0.06);
        const clipRadius = radius - FLAGELLUM_VISUAL.clipUnderlapPx / screenScale;
        if (visibleBounds && !flagellumSegmentVisible(bx, by, bx + tailX * length, by + tailY * length, visibleBounds, Math.max(rootWidth, amp) + 2 / screenScale)) {
            continue;
        }

        const points = [];
        const pointCount = FLAGELLUM_VISUAL.pointCount;
        for (let p = 0; p <= pointCount; p++) {
            const t = p / pointCount;
            const wavePhase = t * Math.PI * (FLAGELLUM_VISUAL.envelopeWaveCycles + FLAGELLUM_VISUAL.envelopeWaveCycleSpread * strokeAsymmetry) + phase;
            const smoothWave = Math.sin(wavePhase);
            const powerStroke = Math.sin(wavePhase) * (0.62 + 0.38 * Math.max(0, Math.sin(wavePhase - Math.PI / 2)))
                + 0.30 * Math.sin(wavePhase * 2.0 + phase * 0.25);
            const distalGain = smoothstep((t - FLAGELLUM_VISUAL.rootStraightFraction) / Math.max(1.0e-6, 1.0 - FLAGELLUM_VISUAL.rootStraightFraction));
            const envelope = Math.sin(t * Math.PI * 0.92) * (0.10 + 0.90 * distalGain);
            const wobble = (smoothWave * (1.0 - strokeAsymmetry) + powerStroke * strokeAsymmetry) * amp * envelope;
            points.push({
                t,
                x: bx + tailX * length * t + normalX * wobble,
                y: by + tailY * length * t + normalY * wobble,
                width: flagellumWidthAt(t, rootWidth, tipWidth),
            });
        }

        geometry.push({
            slot,
            visibleAlpha,
            bx,
            by,
            tailX,
            tailY,
            length,
            rootWidth,
            clipRadius,
            bodyPath: flagellumOutlinePath(points, normalX, normalY, x, y, radius),
        });
    }

    return geometry;
}

function flagellumGeometryCacheKey(params, count, screenScale) {
    const {cell, x, y, radius, scale, animationTime = 0, visibleBounds = null} = params;
    const bounds = visibleBounds
        ? `${q(visibleBounds.minX, 1)}:${q(visibleBounds.minY, 1)}:${q(visibleBounds.maxX, 1)}:${q(visibleBounds.maxY, 1)}`
        : "-";
    return [
        q(x, FLAGELLUM_GEOMETRY_CACHE.positionStep),
        q(y, FLAGELLUM_GEOMETRY_CACHE.positionStep),
        q(radius, FLAGELLUM_GEOMETRY_CACHE.positionStep),
        q(scale, 0.0005),
        q(animationTime, FLAGELLUM_GEOMETRY_CACHE.timeStep),
        q(screenScale, 0.05),
        count,
        q(cell?.directionAngle ?? 0, FLAGELLUM_GEOMETRY_CACHE.angleStep),
        flagellumSlotSignature(cell),
        bounds,
    ].join("|");
}

function flagellumSegmentVisible(x1, y1, x2, y2, bounds, padding = 0) {
    if (!bounds) return true;
    const minX = Math.min(x1, x2) - padding;
    const maxX = Math.max(x1, x2) + padding;
    const minY = Math.min(y1, y2) - padding;
    const maxY = Math.max(y1, y2) + padding;
    return maxX >= bounds.minX && minX <= bounds.maxX && maxY >= bounds.minY && minY <= bounds.maxY;
}

function flagellumOutlinePath(points, normalX, normalY, cellX, cellY, cellRadius) {
    const path = new Path2D();
    if (!Array.isArray(points) || points.length < 2) return path;

    const sideA = flagellumSidePoints(points, normalX, normalY, 1);
    const sideB = flagellumSidePoints(points, normalX, normalY, -1);
    const anchorA = membraneAnchorForFlagellumSide(sideA, cellX, cellY, cellRadius);
    const anchorB = membraneAnchorForFlagellumSide(sideB, cellX, cellY, cellRadius);
    if (!anchorA || !anchorB) return path;

    const blendIndex = Math.min(
        points.length - 1,
        Math.max(FLAGELLUM_VISUAL.minBlendPointIndex, Math.round(points.length * FLAGELLUM_VISUAL.rootBlendPointFraction))
    );
    const blendA = sideA[blendIndex];
    const blendB = sideB[blendIndex];
    const sideAPath = sideA.slice(blendIndex);
    const sideBPath = sideB.slice(blendIndex).reverse();
    const rootTravelX = anchorA.x - anchorB.x;
    const rootTravelY = anchorA.y - anchorB.y;

    path.moveTo(anchorA.x, anchorA.y);
    appendFlagellumRootBezier(
        path,
        anchorA,
        sideA[0],
        blendA,
        sideA[Math.min(sideA.length - 1, blendIndex + 1)],
        cellX,
        cellY,
        rootTravelX,
        rootTravelY
    );
    appendSmoothPolyline(path, sideAPath);
    appendSmoothPolyline(path, sideBPath);
    appendFlagellumRootBezierToAnchor(
        path,
        anchorB,
        sideB[0],
        blendB,
        sideB[Math.min(sideB.length - 1, blendIndex + 1)],
        cellX,
        cellY,
        rootTravelX,
        rootTravelY
    );
    appendFlagellumMembraneRootTransition(path, anchorB, anchorA, points[0], sideA[0], sideB[0], cellX, cellY, cellRadius);
    path.closePath();
    return path;
}

function flagellumWidthAt(t, rootWidth, tipWidth) {
    const stemWidth = tipWidth + (rootWidth - tipWidth) * Math.pow(1.0 - t, FLAGELLUM_VISUAL.widthExponent);
    const flareFade = 1.0 - smoothstep(t / Math.max(1.0e-6, FLAGELLUM_VISUAL.rootFlareLengthFraction));
    return stemWidth + rootWidth * (FLAGELLUM_VISUAL.rootFlareWidthBoost - 1.0) * flareFade;
}

function appendFlagellumMembraneRootTransition(path, anchorB, anchorA, rootCenter, rootA, rootB, cellX, cellY, cellRadius) {
    const anchorMidX = (anchorA.x + anchorB.x) * 0.5;
    const anchorMidY = (anchorA.y + anchorB.y) * 0.5;
    const rootMidX = Number.isFinite(rootCenter?.x) ? rootCenter.x : ((rootA?.x ?? anchorA.x) + (rootB?.x ?? anchorB.x)) * 0.5;
    const rootMidY = Number.isFinite(rootCenter?.y) ? rootCenter.y : ((rootA?.y ?? anchorA.y) + (rootB?.y ?? anchorB.y)) * 0.5;
    const inward = normalizeVector(cellX - rootMidX, cellY - rootMidY, cellX - anchorMidX, cellY - anchorMidY);
    const travelX = anchorA.x - anchorB.x;
    const travelY = anchorA.y - anchorB.y;
    const tangentB = rootTangentForTravel(anchorB, cellX, cellY, travelX, travelY);
    const tangentA = rootTangentForTravel(anchorA, cellX, cellY, travelX, travelY);
    const span = Math.max(1.0e-6, Math.hypot(travelX, travelY));
    const rootWidth = Math.max(span * 0.5, Math.hypot((rootA?.x ?? anchorA.x) - (rootB?.x ?? anchorB.x), (rootA?.y ?? anchorA.y) - (rootB?.y ?? anchorB.y)) * 0.5);
    const overlap = Math.max(
        span * 0.20,
        Math.min(cellRadius * 0.12, rootWidth * 0.30 + cellRadius * 0.015)
    );
    const saddle = {
        x: anchorMidX + inward.x * overlap,
        y: anchorMidY + inward.y * overlap,
    };
    const across = normalizeVector(travelX, travelY, tangentB.x, tangentB.y);
    const tangentPull = Math.min(span * 0.38, Math.max(span * 0.16, rootWidth * 0.28));
    const saddlePull = Math.min(span * 0.24, Math.max(span * 0.10, rootWidth * 0.20));

    path.bezierCurveTo(
        anchorB.x + tangentB.x * tangentPull + inward.x * overlap * 0.18,
        anchorB.y + tangentB.y * tangentPull + inward.y * overlap * 0.18,
        saddle.x - across.x * saddlePull,
        saddle.y - across.y * saddlePull,
        saddle.x,
        saddle.y
    );
    path.bezierCurveTo(
        saddle.x + across.x * saddlePull,
        saddle.y + across.y * saddlePull,
        anchorA.x - tangentA.x * tangentPull + inward.x * overlap * 0.18,
        anchorA.y - tangentA.y * tangentPull + inward.y * overlap * 0.18,
        anchorA.x,
        anchorA.y
    );
}

function appendSmoothPolyline(path, points) {
    if (!Array.isArray(points) || points.length < 2) return;
    path.lineTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        const midX = (current.x + next.x) * 0.5;
        const midY = (current.y + next.y) * 0.5;
        path.quadraticCurveTo(current.x, current.y, midX, midY);
    }
    const penultimate = points[points.length - 2];
    const last = points[points.length - 1];
    path.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y);
}

function appendFlagellumRootBezier(path, anchor, root, blend, next, cellX, cellY, travelX, travelY) {
    const tangent = rootTangentForTravel(anchor, cellX, cellY, travelX, travelY);
    const dirAtBlend = normalizeVector(next.x - root.x, next.y - root.y, tangent.x, tangent.y);
    const rootDistance = Math.hypot(root.x - anchor.x, root.y - anchor.y);
    const blendDistance = Math.hypot(blend.x - root.x, blend.y - root.y);
    const controlPull = Math.min(rootDistance * FLAGELLUM_VISUAL.rootBezierInPull, Math.hypot(blend.x - anchor.x, blend.y - anchor.y) * 0.62);
    path.bezierCurveTo(
        anchor.x + tangent.x * controlPull,
        anchor.y + tangent.y * controlPull,
        blend.x - dirAtBlend.x * blendDistance * FLAGELLUM_VISUAL.rootBezierOutPull,
        blend.y - dirAtBlend.y * blendDistance * FLAGELLUM_VISUAL.rootBezierOutPull,
        blend.x,
        blend.y
    );
}

function appendFlagellumRootBezierToAnchor(path, anchor, root, blend, prev, cellX, cellY, travelX, travelY) {
    const tangent = rootTangentForTravel(anchor, cellX, cellY, travelX, travelY);
    const dirFromPrev = normalizeVector(blend.x - prev.x, blend.y - prev.y, tangent.x, tangent.y);
    const rootDistance = Math.hypot(root.x - anchor.x, root.y - anchor.y);
    const blendDistance = Math.hypot(blend.x - root.x, blend.y - root.y);
    const controlPull = Math.min(rootDistance * FLAGELLUM_VISUAL.rootBezierInPull, Math.hypot(blend.x - anchor.x, blend.y - anchor.y) * 0.62);
    path.bezierCurveTo(
        blend.x + dirFromPrev.x * blendDistance * FLAGELLUM_VISUAL.rootBezierOutPull,
        blend.y + dirFromPrev.y * blendDistance * FLAGELLUM_VISUAL.rootBezierOutPull,
        anchor.x - tangent.x * controlPull,
        anchor.y - tangent.y * controlPull,
        anchor.x,
        anchor.y
    );
}

function rootTangentForTravel(anchor, cellX, cellY, travelX, travelY) {
    const radial = normalizeVector(anchor.x - cellX, anchor.y - cellY, 1, 0);
    return chooseTangentDirection(radial, travelX, travelY);
}

function chooseTangentDirection(radial, towardX, towardY) {
    const tangentCw = {x: radial.y, y: -radial.x};
    const tangentCcw = {x: -radial.y, y: radial.x};
    return (tangentCw.x * towardX + tangentCw.y * towardY) >= (tangentCcw.x * towardX + tangentCcw.y * towardY)
        ? tangentCw
        : tangentCcw;
}

function normalizeVector(x, y, fallbackX = 1, fallbackY = 0) {
    const len = Math.hypot(x, y);
    if (len <= 1.0e-9) return normalizeFallbackVector(fallbackX, fallbackY);
    return {x: x / len, y: y / len};
}

function normalizeFallbackVector(x, y) {
    const len = Math.hypot(x, y);
    if (len <= 1.0e-9) return {x: 1, y: 0};
    return {x: x / len, y: y / len};
}

function flagellumSlotPerformance(slot) {
    const explicit = Number(slot?.performance);
    if (Number.isFinite(explicit)) return clamp01(explicit);
    return damagePerformance(slot?.damage);
}

function damagePerformance(damage) {
    return clamp01(Math.exp(-Math.max(0, Number(damage) || 0)));
}

function flagellumSlotForceScale(slot, cell, radius = 1) {
    if (cell?.dead) return 0;
    const force = Math.max(0, Number(slot?.force ?? 0) || 0);
    const base = Math.max(1.0e-6, 0.045 * Math.max(radius, 1) * Math.max(radius, 1) * Math.max(1.0, Number(slot?.length ?? radius) / Math.max(radius, 1.0e-6)));
    return clamp01(force / base);
}

function fillFlagellumPath(ctx, path) {
    ctx.fill(path);
}

function flagellumSidePoints(points, normalX, normalY, sign) {
    return points.map(point => ({
        x: point.x + normalX * point.width * sign,
        y: point.y + normalY * point.width * sign,
    }));
}

function membraneAnchorForFlagellumSide(side, cellX, cellY, cellRadius) {
    for (let i = 0; i < side.length - 1; i++) {
        const intersection = segmentCircleIntersection(side[i], side[i + 1], cellX, cellY, cellRadius);
        if (intersection) return pointWithAngle(intersection, cellX, cellY);
    }

    return pointWithAngle(projectPointToCircle(side[0], cellX, cellY, cellRadius), cellX, cellY);
}

function segmentCircleIntersection(a, b, cx, cy, radius) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const fx = a.x - cx;
    const fy = a.y - cy;
    const aa = dx * dx + dy * dy;
    if (aa <= 1.0e-12) return null;

    const bb = 2 * (fx * dx + fy * dy);
    const cc = fx * fx + fy * fy - radius * radius;
    const disc = bb * bb - 4 * aa * cc;
    if (disc < 0) return null;

    const root = Math.sqrt(disc);
    const t1 = (-bb - root) / (2 * aa);
    const t2 = (-bb + root) / (2 * aa);
    const candidates = [t1, t2]
        .filter(t => t >= -1.0e-6 && t <= 1 + 1.0e-6)
        .sort((left, right) => left - right);
    if (!candidates.length) return null;

    const t = clamp(candidates[0], 0, 1);
    return {x: a.x + dx * t, y: a.y + dy * t};
}

function projectPointToCircle(point, cx, cy, radius) {
    const dx = point.x - cx;
    const dy = point.y - cy;
    const len = Math.hypot(dx, dy);
    if (len <= 1.0e-9) return {x: cx + radius, y: cy};
    return {x: cx + dx / len * radius, y: cy + dy / len * radius};
}

function pointWithAngle(point, cx, cy) {
    return {
        x: point.x,
        y: point.y,
        angle: Math.atan2(point.y - cy, point.x - cx),
    };
}

function appendShortestArc(path, cx, cy, radius, startAngle, endAngle) {
    let delta = ((endAngle - startAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (delta > Math.PI) delta -= Math.PI * 2;
    path.arc(cx, cy, radius, startAngle, startAngle + delta, delta < 0);
}

function drawFlagellumShadowLayer(ctx, path, cellX, cellY, cellRadius, visual, visibleAlpha, layerAlpha) {
    const shadowAngle = radiansFromDegrees(visual?.lightDirectionAngle);
    const rawGradient = Number(visual?.lightGradient);
    const strength = Number.isFinite(rawGradient) ? clamp01(Math.max(0, rawGradient) * CELL_LIGHTING_DETAIL.gradientScale) : 0.0;
    const softenedStrength = strength * 0.58;
    const alpha = CELL_LIGHTING_DETAIL.maxShadowAlpha * softenedStrength * clamp01(layerAlpha) * clamp01(visibleAlpha) * 0.42;
    if (!Number.isFinite(shadowAngle) || alpha <= 0.001 || cellRadius <= 0) return;

    ctx.save();
    clipOutsideCell(ctx, cellX, cellY, cellRadius);
    ctx.clip(path);
    ctx.translate(cellX, cellY);
    ctx.rotate(shadowAngle);
    drawSoftSideShadowRect(ctx, cellRadius * 3.2, alpha, softenedStrength * clamp01(layerAlpha));
    ctx.restore();
}

function drawDeadFlagellumFilterLayer(ctx, path, cell, illum, grayscale) {
    const lightness = modulateLightness(ORGANIC_BROWN_COLOR.l, illum);
    const overlayAlpha = clamp01(0.42 + Math.min(0.35, (cell?.lifetimeTicks ?? 0) / 180));
    if (overlayAlpha <= 0.001) return;

    ctx.save();
    ctx.globalCompositeOperation = grayscale ? "source-over" : "multiply";
    ctx.fillStyle = grayscale
        ? `hsla(0, 0%, ${lightness}%, ${overlayAlpha.toFixed(3)})`
        : organicBrownHsla(lightness, overlayAlpha);
    fillFlagellumPath(ctx, path);
    ctx.restore();
}

function clipOutsideCell(ctx, x, y, radius) {
    const effectiveRadius = Math.max(0, Number(radius) || 0);
    const size = Math.max(effectiveRadius * 5.0, 6000);
    ctx.beginPath();
    ctx.rect(x - size, y - size, size * 2, size * 2);
    ctx.arc(x, y, effectiveRadius, 0, Math.PI * 2, true);
    ctx.clip("evenodd");
}

function fillFlagellumHatchCircle(ctx, x, y, radius, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let p = -radius * 2; p <= radius * 2; p += 4) {
        ctx.beginPath();
        ctx.moveTo(x + p - radius, y - radius);
        ctx.lineTo(x + p + radius, y + radius);
        ctx.stroke();
    }
    ctx.restore();
}

function flagellumSlotsForRender(cell, count, radius, scale) {
    const fallback = fallbackFlagellumSlots(cell, count, radius);
    const slots = Array.isArray(cell?.flagellumSlots) ? cell.flagellumSlots : [];
    if (!slots.length) return fallback;

    return fallback.map((base, i) => {
        const slot = slots[i] ?? {};
        const rawBaseX = Number(slot.baseX);
        const rawBaseY = Number(slot.baseY);
        const rawDirX = Number(slot.directionX);
        const rawDirY = Number(slot.directionY);
        const baseValid = Number.isFinite(rawBaseX) && Number.isFinite(rawBaseY) && Math.hypot(rawBaseX, rawBaseY) > 1.0e-6;
        const dirValid = Number.isFinite(rawDirX) && Number.isFinite(rawDirY) && Math.hypot(rawDirX, rawDirY) > 1.0e-6;
        return {
            ...base,
            index: Number(slot.index ?? i),
            damage: Number(slot.damage ?? base.damage ?? 0) || 0,
            motorPower: Number(slot.motorPower ?? cell?.genome?.flagellumMotorPower ?? base.motorPower ?? 30) || 30,
            baseX: baseValid ? rawBaseX * scale : base.baseX,
            baseY: baseValid ? rawBaseY * scale : base.baseY,
            directionX: dirValid ? rawDirX : base.directionX,
            directionY: dirValid ? rawDirY : base.directionY,
            length: Number(slot.length ?? base.length ?? 0) * (Number(slot.length) ? scale : 1),
            thickness: Number(slot.thickness ?? base.thickness ?? 0) * (Number(slot.thickness) ? scale : 1),
            force: Number.isFinite(Number(slot.force)) ? Math.max(0, Number(slot.force)) : base.force,
        };
    });
}

function fallbackFlagellumSlots(cell, count, radius) {
    const genome = cell?.genome ?? {};
    const forward = ((Number(cell?.directionAngle ?? 0) || 0) - 90) * Math.PI / 180;
    const amount = Boolean(genome.flagellumEnabled ?? count > 0)
        ? Math.max(0, Math.min(2, Math.round(count ?? genome.flagellumCount ?? 0)))
        : 0;
    const rearPlacement = Math.PI;
    const spread = effectiveFlagellumPairSpreadRadians(genome);
    const steering = Math.max(-1, Math.min(1, (Number(genome.flagellumSteeringAsymmetry ?? 0) || 0) / 100));
    const motorActivity = clamp01((Number(genome.flagellumMotorPower ?? 30) || 0) / 100);
    const damage = clamp01(Number(cell?.startFlagellumDamage ?? cell?.flagellumDamage ?? 0) || 0);
    const performance = damagePerformance(damage);
    const lengthBase = radius * flagellumLengthFactorFromGenome(genome);
    const thicknessBase = radius * flagellumThicknessFactorFromGenome(genome);
    const result = [];

    for (let i = 0; i < amount; i++) {
        const side = amount > 1 ? (i === 0 ? -1 : 1) : 0;
        const relative = amount > 1 ? rearPlacement + side * spread * 0.5 : rearPlacement;
        const attachment = forward + relative;
        const thrust = amount > 1 ? forward : forward + steering * 28 * Math.PI / 180;
        const sideBias = amount > 1 ? Math.max(0.15, Math.min(1.85, 1 + side * steering * 0.45)) : 1.0;
        const fallbackForce = 0.045 * radius * radius * motorActivity * sideBias * performance * Math.max(1.0, lengthBase / Math.max(radius, 1.0e-6));
        result.push({
            index: i,
            damage,
            performance,
            motorPower: motorActivity * sideBias * 100,
            baseX: Math.cos(attachment) * radius,
            baseY: Math.sin(attachment) * radius,
            directionX: Math.cos(thrust),
            directionY: Math.sin(thrust),
            length: lengthBase,
            thickness: thicknessBase,
            force: fallbackForce,
        });
    }
    return result;
}


function flagellumLengthFactorFromGenome(genome = {}) {
    const raw = Number(genome.flagellumLength ?? 1.8);
    if (!Number.isFinite(raw)) return 1.8;
    if (raw > 5) return 1.0 + 3.0 * clamp01(raw / 100);
    return Math.max(1.0, Math.min(4.0, raw));
}

function flagellumThicknessFactorFromGenome(genome = {}) {
    const length = flagellumLengthFactorFromGenome(genome);
    const t = clamp01((length - 1.0) / 3.0);
    const thickness = FLAGELLUM_VISUAL.maxThicknessFactor
        - (FLAGELLUM_VISUAL.maxThicknessFactor - FLAGELLUM_VISUAL.minThicknessFactor)
            * Math.pow(t, FLAGELLUM_VISUAL.thicknessLengthPower);
    const pairScale = Math.round(Number(genome?.flagellumCount ?? 1)) >= 2
        ? FLAGELLUM_VISUAL.pairThicknessScale
        : 1.0;
    return thickness * pairScale;
}

function minFlagellumPairSpreadRadians(genome = {}) {
    const rootHalfWidthToRadius = flagellumThicknessFactorFromGenome(genome) * FLAGELLUM_VISUAL.rootWidthBoost;
    return 2 * Math.asin(Math.max(0, Math.min(0.95, rootHalfWidthToRadius)));
}

function maxFlagellumPairSpreadRadians(genome = {}) {
    const rootHalfWidthToRadius = flagellumThicknessFactorFromGenome(genome) * FLAGELLUM_VISUAL.rootWidthBoost;
    const margin = 2 * Math.asin(Math.max(0, Math.min(0.95, rootHalfWidthToRadius)));
    return Math.max(minFlagellumPairSpreadRadians(genome), Math.PI - margin);
}

function effectiveFlagellumPairSpreadRadians(genome = {}) {
    const minSpread = minFlagellumPairSpreadRadians(genome);
    const maxSpread = maxFlagellumPairSpreadRadians(genome);
    const raw = Number(genome.flagellumPairSpreadAngle ?? 36);
    const t = clamp01((Number.isFinite(raw) ? raw : 36) / 180);
    return minSpread + (maxSpread - minSpread) * t;
}

function lerpAngle(a, b, t) {
    let delta = ((b - a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (delta > Math.PI) delta -= Math.PI * 2;
    return a + delta * clamp01(t);
}

function drawCapturedFood(ctx, slot, capturedFood, position, mode, illum = 1.0, preview = false) {
    const {x, y, radius} = position;
    const foodId = Number(slot?.foodId ?? capturedFood?.id ?? 1);
    if (mode === "energy") {
        fillFoodShapeAt(ctx, foodId, x, y, radius, rgb({r: 255, g: 218, b: 38}, 0.96), 1.0);
        return;
    }

    const baseLightness = 33;
    const shadedLightness = preview ? baseLightness : modulateLightness(baseLightness, illum);
    const innerLightness = preview
        ? 42
        : Math.round(baseLightness - (baseLightness - shadedLightness) * FOOD_INNER_BODY.darkeningFactor);
    fillFoodShapeAt(ctx, foodId, x, y, radius, organicBrownHsla(shadedLightness, FOOD_INNER_BODY.mainAlpha), 1.0);
    fillFoodShapeAt(ctx, foodId, x, y, radius, organicBrownHsla(innerLightness, FOOD_INNER_BODY.innerAlpha), FOOD_INNER_BODY.scale);
}

function capturedFoodPosition(food, cell, x, y, scale, fallbackX, fallbackY, fallbackRadius) {
    if (!food || !Number.isFinite(Number(cell?.x)) || !Number.isFinite(Number(cell?.y))) {
        return {x: fallbackX, y: fallbackY, radius: Math.max(0, Number(fallbackRadius) || 0)};
    }
    return {
        x: x + (Number(food.x) - Number(cell.x)) * scale,
        y: y + (Number(food.y) - Number(cell.y)) * scale,
        radius: Math.max(0, Number(food.radius) * scale),
    };
}

function drawCytosolTexture(ctx, x, y, radius, color, alpha, seed, preview) {
    const baseAlpha = clamp01(alpha) * (preview ? CYTOSOL_TEXTURE.previewAlpha : CYTOSOL_TEXTURE.alpha);
    if (baseAlpha <= 0.001 || radius <= 1.0) return;

    const granuleLimit = preview
        ? CYTOSOL_TEXTURE.previewGranules
        : Math.min(CYTOSOL_TEXTURE.worldGranules, Math.max(4, Math.round(radius * 0.30)));
    const c = color ?? {r: 238, g: 240, b: 232};

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.96, 0, Math.PI * 2);
    ctx.clip();

    for (let i = 0; i < granuleLimit; i++) {
        const angle = hash01(seed + 3907, i * 2 + 1) * Math.PI * 2;
        const radial = Math.sqrt(hash01(seed + 3907, i * 2 + 2)) * radius * 0.82;
        const px = x + Math.cos(angle) * radial;
        const py = y + Math.sin(angle) * radial;
        const gr = preview
            ? radius * (0.004 + 0.010 * hash01(seed + 3907, i * 3 + 5))
            : radius * (CYTOSOL_TEXTURE.minRadius + (CYTOSOL_TEXTURE.maxRadius - CYTOSOL_TEXTURE.minRadius) * hash01(seed + 3907, i * 3 + 5)) * 0.018;
        if (gr <= DRAW_THRESHOLDS.minTextureDotRadius) continue;
        ctx.fillStyle = rgb({r: Math.min(255, c.r + 18), g: Math.min(255, c.g + 18), b: Math.min(255, c.b + 18)}, baseAlpha * (0.65 + 0.35 * hash01(seed + 3907, i * 5 + 7)));
        ctx.beginPath();
        ctx.arc(px, py, gr, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawMembraneOverlay(ctx, x, y, radius, color, alpha, preview = false) {
    const a = clamp01(alpha);
    if (a <= 0.001) return;
    const c = color ?? {r: 206, g: 197, b: 172};
    const gradient = ctx.createRadialGradient(x, y, radius * 0.08, x, y, radius);
    gradient.addColorStop(0.00, rgb(c, a));
    gradient.addColorStop(0.68, rgb(c, a + (1.0 - a) * 0.24));
    gradient.addColorStop(0.90, rgb(c, a + (1.0 - a) * 0.62));
    gradient.addColorStop(0.98, rgb(c, a + (1.0 - a) * 0.90));
    gradient.addColorStop(1.00, rgb(c, 1.0));

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (preview) {
        ctx.strokeStyle = rgb(c, Math.min(1.0, a * 0.92));
        ctx.lineWidth = Math.max(0.25, Math.min(0.85, radius * 0.015));
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.0, radius - 0.35), 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function drawCellLightCrescents(ctx, params) {
    const {x, y, radius, visual, cursorLight, cellOpacity} = params;
    const cursorAngle = cursorLight && Number.isFinite(cursorLight.x) && Number.isFinite(cursorLight.y)
        ? Math.atan2(cursorLight.y - y, cursorLight.x - x)
        : null;
    const shadowAngle = cursorAngle ?? radiansFromDegrees(visual?.lightDirectionAngle);
    const highlightAngle = cursorAngle ?? radiansFromDegrees(visual?.highlightDirectionAngle ?? visual?.lightDirectionAngle);

    const shadowStrength = Number.isFinite(Number(visual?.lightGradient))
        ? clamp01(Math.max(0, Number(visual.lightGradient)) * CELL_LIGHTING_DETAIL.gradientScale)
        : (cursorAngle == null ? 0.0 : 0.42);
    const highlightStrength = Number.isFinite(Number(visual?.highlightStrength))
        ? clamp01(Math.max(0, Number(visual.highlightStrength)))
        : (cursorAngle == null ? 0.0 : 0.58);
    const highlightClarity = Number.isFinite(Number(visual?.highlightClarity))
        ? clamp01(Number(visual.highlightClarity))
        : 1.0;

    const baseOpacity = clamp01(cellOpacity);
    const lightingOpacity = clamp01(Math.max(
        baseOpacity,
        cursorAngle == null ? CELL_LIGHTING_DETAIL.lightingOpacityFloor : CELL_LIGHTING_DETAIL.cursorLightOpacityFloor
    ));
    const shadowAlpha = CELL_LIGHTING_DETAIL.maxShadowAlpha * shadowStrength * lightingOpacity;
    const highlightAlpha = CELL_LIGHTING_DETAIL.maxHighlightAlpha * highlightStrength * lightingOpacity;
    if (shadowAlpha <= 0.001 && highlightAlpha <= 0.001) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(x, y);

    if (shadowAlpha > 0.001 && Number.isFinite(shadowAngle)) {
        ctx.save();
        ctx.rotate(shadowAngle);
        drawSoftCellSideShadow(ctx, radius, shadowAlpha, shadowStrength * lightingOpacity);
        ctx.restore();
    }

    if (highlightAlpha > 0.001 && Number.isFinite(highlightAngle)) {
        ctx.save();
        ctx.rotate(highlightAngle);
        drawSoftCellHighlightCrescent(ctx, radius, highlightAlpha, highlightStrength * lightingOpacity, highlightClarity);
        ctx.restore();
    }

    ctx.restore();
}

function drawOrganelleExternalShadow(ctx, x, y, radius, visual, opacity) {
    const angle = radiansFromDegrees(visual?.lightDirectionAngle);
    const rawGradient = Number(visual?.lightGradient);
    const strength = Number.isFinite(rawGradient) ? clamp01(Math.max(0, rawGradient) * CELL_LIGHTING_DETAIL.gradientScale) : 0.0;
    const lightingOpacity = clamp01(Math.max(clamp01(opacity), CELL_LIGHTING_DETAIL.lightingOpacityFloor));
    const alpha = CELL_LIGHTING_DETAIL.maxShadowAlpha * strength * lightingOpacity;
    if (alpha <= 0.001 || !Number.isFinite(angle)) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(angle);
    drawSoftCellSideShadow(ctx, radius, alpha, strength * lightingOpacity);
    ctx.restore();
}

function drawSoftCellSideShadow(ctx, radius, alpha, strength) {
    const edgeAlpha = clamp01(Math.max(alpha * CELL_LIGHTING_DETAIL.shadowEdgeAlpha, CELL_LIGHTING_DETAIL.shadowEdgeAlpha * strength));
    const midAlpha = clamp01(CELL_LIGHTING_DETAIL.shadowMidAlpha * strength);
    if (edgeAlpha <= 0.001 && midAlpha <= 0.001) return;

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    const gradient = ctx.createLinearGradient(-radius, 0, radius, 0);
    gradient.addColorStop(0.00, `rgba(0, 0, 0, ${edgeAlpha.toFixed(3)})`);
    gradient.addColorStop(0.32, `rgba(0, 0, 0, ${midAlpha.toFixed(3)})`);
    gradient.addColorStop(CELL_LIGHTING_DETAIL.shadowReach, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1.00, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawSoftSideShadowRect(ctx, extent, alpha, strength) {
    const safeExtent = Math.max(1.0, Number(extent) || 1.0);
    const edgeAlpha = clamp01(Math.max(alpha * CELL_LIGHTING_DETAIL.shadowEdgeAlpha, CELL_LIGHTING_DETAIL.shadowEdgeAlpha * strength));
    const midAlpha = clamp01(CELL_LIGHTING_DETAIL.shadowMidAlpha * strength);
    if (edgeAlpha <= 0.001 && midAlpha <= 0.001) return;

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    const gradient = ctx.createLinearGradient(-safeExtent, 0, safeExtent, 0);
    gradient.addColorStop(0.00, `rgba(0, 0, 0, ${edgeAlpha.toFixed(3)})`);
    gradient.addColorStop(0.32, `rgba(0, 0, 0, ${midAlpha.toFixed(3)})`);
    gradient.addColorStop(CELL_LIGHTING_DETAIL.shadowReach, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1.00, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(-safeExtent, -safeExtent, safeExtent * 2, safeExtent * 2);
    ctx.restore();
}

function drawSoftCellHighlightCrescent(ctx, radius, alpha, strength, clarity = 1.0) {
    const crispness = clamp01(clarity);
    const softness = 1.0 - crispness;
    const mainAlpha = clamp01(alpha * (0.82 + 0.18 * crispness));
    const coreAlpha = clamp01(CELL_LIGHTING_DETAIL.highlightCoreAlpha * strength * (0.44 + 0.56 * crispness));
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

function fillLysosomeRadial(ctx, x, y, radius, rotation, color, alpha) {
    const a = clamp01(alpha);
    if (a <= 0.001) return;
    const center = color ?? {r: 180, g: 36, b: 38};
    const midEdge = darkenRgb(center, 16);
    const edge = darkenRgb(center, 46);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(1.05, 0.92);
    const gradient = ctx.createRadialGradient(0, 0, radius * 0.04, 0, 0, radius);
    gradient.addColorStop(0.00, rgb(center, a));
    gradient.addColorStop(0.48, rgb(center, a * 0.98));
    gradient.addColorStop(0.82, rgb(midEdge, a * 0.97));
    gradient.addColorStop(1.00, rgb(edge, a));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function fillSolidCircle(ctx, x, y, radius, color, alpha) {
    const a = clamp01(alpha);
    if (a <= 0.001) return;
    ctx.save();
    ctx.fillStyle = rgb(color, a);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function fillEllipse(ctx, x, y, sx, sy, rotation, color, alpha) {
    const a = clamp01(alpha);
    if (a <= 0.001) return;
    ctx.save();
    ctx.fillStyle = rgb(color, a);
    ctx.beginPath();
    ctx.ellipse(x, y, sx, sy, rotation, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawCytosolHoverFill(ctx, x, y, radius, alpha) {
    const a = clamp01(alpha);
    if (a <= 0.001) return;
    fillHatchCircle(ctx, x, y, radius, `rgba(255,255,255,${(0.24 * a).toFixed(3)})`);
}

function drawCytosolHoverOutline(ctx, x, y, radius, alpha) {
    const a = clamp01(alpha);
    if (a <= 0.001) return;
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = `rgba(255,255,255,${(0.86 * a).toFixed(3)})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawMembraneHoverFill(ctx, x, y, radius, alpha) {
    fillHatchCircleWithRadialFade(ctx, x, y, radius, alpha);
}

function drawMembraneHoverOutline(ctx, x, y, radius, alpha) {
    const a = clamp01(alpha);
    if (a <= 0.001) return;
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = `rgba(255,255,255,${(0.80 * a).toFixed(3)})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function fillHatchCircle(ctx, x, y, r, color) {
    if (r <= 1.0) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.setLineDash([]);
    ctx.lineWidth = 1.55;
    for (let d = -r * 2; d <= r * 2; d += 5) {
        ctx.beginPath();
        ctx.moveTo(x - r + d, y + r);
        ctx.lineTo(x + r + d, y - r);
        ctx.stroke();
    }
    ctx.restore();
}

function fillHatchCircleDown(ctx, x, y, r, color) {
    if (r <= 1.0) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.setLineDash([]);
    ctx.lineWidth = 1.35;
    for (let d = -r * 2; d <= r * 2; d += 5) {
        ctx.beginPath();
        ctx.moveTo(x - r + d, y - r);
        ctx.lineTo(x + r + d, y + r);
        ctx.stroke();
    }
    ctx.restore();
}

function fillHatchEllipseDown(ctx, x, y, sx, sy, rotation, color) {
    const span = Math.max(sx, sy);
    if (span <= 1.0) return;
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

function fillHatchCircleWithRadialFade(ctx, x, y, r, alpha) {
    const a = clamp01(alpha);
    if (a <= 0.001 || r <= 1.0) return;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0.0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.52, "rgba(255,255,255,0)");
    gradient.addColorStop(0.76, `rgba(255,255,255,${(0.11 * a).toFixed(3)})`);
    gradient.addColorStop(1.0, `rgba(255,255,255,${(0.28 * a).toFixed(3)})`);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = gradient;
    ctx.setLineDash([]);
    ctx.lineWidth = 1.55;
    for (let d = -r * 2; d <= r * 2; d += 5) {
        ctx.beginPath();
        ctx.moveTo(x - r + d, y - r);
        ctx.lineTo(x + r + d, y + r);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - r + d, y + r);
        ctx.lineTo(x + r + d, y - r);
        ctx.stroke();
    }
    ctx.restore();
}

function chloroplastLayout(seed, i, radius, count = 1) {
    const visibleCount = Math.max(1, Math.round(count ?? 1));
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const seedAngle = hash01(seed, 911) * Math.PI * 2;
    const density = Math.min(1.0, Math.max(0.0, (visibleCount - 1) / 23));
    const jitterScale = 1.0 - density * 0.48;
    const slotT = (i + 0.5) / visibleCount;
    const radialJitter = (hash01(seed, i * 4 + 2) - 0.5) * Math.min(0.42 / visibleCount, 0.055) * jitterScale;
    const radial01 = Math.sqrt(clamp(slotT + radialJitter, 0.035, 0.965));
    const angleJitter = (hash01(seed, i * 4 + 1) - 0.5) * goldenAngle * Math.min(0.58, 1.25 / Math.sqrt(visibleCount)) * jitterScale;
    const angle = seedAngle + i * goldenAngle + angleJitter;
    const distance = radial01 * radius * 0.82;
    const edgeT = smoothstep((radial01 - 0.66) / 0.24);
    return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotation: angle + Math.PI / 2 + (hash01(seed, i * 4 + 3) - 0.5) * 0.28,
        normalScale: 0.78 - edgeT * 0.34,
    };
}

function lysosomeLayoutFromSlot(slot, scale = 1.0) {
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

function lysosomeLayouts(seed, count, radius, slots = [], slotScale = 1.0) {
    return radialOrganelleLayouts(
        seed,
        count,
        radius,
        slots,
        (cellRadius, slot) => {
            const base = cellRadius * 0.112;
            const foodRadius = Math.max(0, Number(slot?.foodRadius ?? slot?.targetFoodRadius ?? 0) || 0) * slotScale;
            const stretched = foodRadius > 0 ? foodRadius * 1.22 : base;
            return Math.max(base, stretched);
        }
    );
}

export function buildCapturedFoodSlotMap(foods = []) {
    const captured = new Map();
    for (const food of foods ?? []) {
        if (food?.capturedByCellId == null) continue;
        const cellId = Number(food.capturedByCellId);
        const slotIndex = Math.round(Number(food.digestionSlotIndex));
        if (!Number.isFinite(cellId) || !Number.isFinite(slotIndex)) continue;
        captured.set(`${cellId}:${slotIndex}`, food);
    }
    return captured;
}

function capturedFoodForSlot(cell, capturedFoods, index) {
    const cellId = Number(cell?.id);
    if (!Number.isFinite(cellId)) return null;
    if (capturedFoods?.get) {
        return capturedFoods.get(`${cellId}:${index}`) ?? null;
    }
    for (const food of capturedFoods ?? []) {
        if (Number(food?.capturedByCellId) === cellId && Math.round(Number(food?.digestionSlotIndex)) === index) {
            return food;
        }
    }
    return null;
}


function rotateCellLocalOffset(offsetX, offsetY, cell, transform = null) {
    return rotateOffset(offsetX, offsetY, transform ?? buildCellLocalTransform(cell));
}

function cellRotationRadians(cell) {
    return buildCellLocalTransform(cell).angle;
}

function buildCellLocalTransform(cell) {
    const degrees = Number(cell?.directionAngle ?? 0);
    const angle = Number.isFinite(degrees) ? degrees * Math.PI / 180 : 0.0;
    if (Math.abs(angle) <= 1.0e-12) {
        return {angle: 0.0, cos: 1.0, sin: 0.0};
    }
    return {angle, cos: Math.cos(angle), sin: Math.sin(angle)};
}

function rotateOffset(offsetX, offsetY, angleOrTransform) {
    const transform = typeof angleOrTransform === "number"
        ? (Number.isFinite(angleOrTransform) ? {angle: angleOrTransform, cos: Math.cos(angleOrTransform), sin: Math.sin(angleOrTransform)} : null)
        : angleOrTransform;
    if (!transform || Math.abs(transform.angle ?? 0) <= 1.0e-12) {
        return {x: offsetX, y: offsetY};
    }
    return {
        x: offsetX * transform.cos - offsetY * transform.sin,
        y: offsetX * transform.sin + offsetY * transform.cos,
    };
}

function lerp(a, b, t) {
    return a + (b - a) * clamp01(t);
}

export function cellIlluminance(cell, lighting) {
    const rawLight = typeof cell?.localLight === "number"
        ? cell.localLight
        : objectRawLight(cell, lighting, lighting?.globalLight ?? 0.75);
    return lightMultiplier(rawLight);
}

function objectRawLight(object, lighting, fallback) {
    return sampleLightingGrid(lighting?.lightMap, lighting, object?.x, object?.y, fallback);
}

function sampleLightingGrid(map, lighting, x, y, fallback) {
    if (!Array.isArray(map) || map.length === 0) return fallback;
    const cols = lighting?.gridWidth ?? 0;
    const rows = lighting?.gridHeight ?? 0;
    const gridStep = Math.max(1, lighting?.gridStep ?? 1);
    if (cols <= 0 || rows <= 0) return fallback;
    const col = Math.max(0, Math.min(cols - 1, Math.floor(Number(x) / gridStep)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor(Number(y) / gridStep)));
    const value = map[row * cols + col];
    return Number.isFinite(value) ? value : fallback;
}

function lightMultiplier(rawLight) {
    const clampedLight = Math.max(0, Math.min(1, Number(rawLight)));
    return CELL_MIN_LIGHT + clampedLight * (1 - CELL_MIN_LIGHT);
}

function modulateLightness(baseLightness, illuminance) {
    const minL = 5;
    return Math.round(minL + (baseLightness - minL) * clamp01(illuminance));
}

function colorForRender(color, illum, grayscale) {
    const c = grayscale ? grayscaleRgb(color) : color;
    return modulateRgb(c ?? {r: 238, g: 240, b: 232}, illum);
}

function organelleAlpha(realOpacity = 0.0, kind = "", diagnosticMode = false) {
    const opacity = clamp01(realOpacity);
    if (opacity <= 0.001) return 0.0;
    if (diagnosticMode) return 1.0;
    if (kind === "chloroplast") return clamp01(Math.max(ORGANELLE_VISIBILITY.chloroplastMinAlpha, opacity * ORGANELLE_VISIBILITY.chloroplastBoost));
    if (kind === "lysosome") return clamp01(Math.max(ORGANELLE_VISIBILITY.lysosomeMinAlpha, opacity * ORGANELLE_VISIBILITY.lysosomeBoost));
    if (kind === "flagellum") return clamp01(Math.max(0.34, opacity * 1.48));
    if (kind === "nucleoid") return clamp01(Math.max(ORGANELLE_VISIBILITY.nucleoidMinAlpha, opacity * ORGANELLE_VISIBILITY.nucleoidBoost));
    return opacity;
}

function layerAlpha(realOpacity = 0.1) {
    const opacity = Number(realOpacity ?? 0.1);
    if (!Number.isFinite(opacity) || opacity <= 0.0) return 0.0;
    return clamp01(opacity);
}

function normalizedBioluminescence(cell) {
    return cell?.genome?.bioluminescenceEnabled ? clamp01((cell?.genome?.bioluminescence ?? 0) / 100.0) : 0.0;
}

function seedFor(cell, visual, preview = false, fallback = 1) {
    const value = Number(cell?.id);
    if (Number.isFinite(value) && value !== 0) return value;
    if (preview) return 811;
    return Number(fallback) || Number(visual?.chloroplastAmount ?? visual?.lysosomeAmount ?? 1) || 1;
}

function previewLayerCount(count) {
    return Math.max(1, Math.min(3, Math.round(Number(count) || 3)));
}

function normalizeOrganelleId(value) {
    const normalized = String(value ?? "general").toLowerCase();
    return normalized === "nucleoid" ? "nucleus" : normalized;
}

function defaultLabelFor(id) {
    if (id === "nucleus" || id === "nucleoid") return "Nucleus";
    if (id === "flagellum") return "Flagellum";
    return String(id ?? "").charAt(0).toUpperCase() + String(id ?? "").slice(1);
}

function modulateRgb(color, illum) {
    const i = clamp01(illum);
    const min = 24;
    return {
        r: Math.round(min + (Number(color?.r ?? 255) - min) * i),
        g: Math.round(min + (Number(color?.g ?? 255) - min) * i),
        b: Math.round(min + (Number(color?.b ?? 255) - min) * i),
        opacity: color?.opacity,
    };
}

function darkenRgb(color, amount) {
    return {r: Math.max(0, Math.round((color?.r ?? 255) - amount)), g: Math.max(0, Math.round((color?.g ?? 255) - amount)), b: Math.max(0, Math.round((color?.b ?? 255) - amount))};
}

function radiansFromDegrees(degrees) {
    return Number.isFinite(Number(degrees)) ? Number(degrees) * Math.PI / 180 : null;
}

function fillFoodShapeAt(ctx, foodId, x, y, radius, fillStyle, scale = 1.0) {
    const r = Number(radius) || 0;
    if (r <= DRAW_THRESHOLDS.minOrganelleRadius) return;
    const path = foodPath(foodId);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r * scale, r * scale);
    ctx.fillStyle = fillStyle;
    ctx.fill(path);
    ctx.restore();
}

function foodPath(foodId) {
    const key = Number(foodId) || 1;
    if (foodPathCache.has(key)) return foodPathCache.get(key);
    if (foodPathCache.size > FOOD_SHAPE.cacheLimit) foodPathCache.clear();
    const path = createFoodPath(key);
    foodPathCache.set(key, path);
    return path;
}

function createFoodPath(foodId) {
    const random = seededRandom(Number(foodId) || 1);
    const points = [];
    for (let i = 0; i < FOOD_SHAPE.pointCount; i++) {
        const angle = i / FOOD_SHAPE.pointCount * Math.PI * 2;
        const noise = (random() * 2 - 1) * FOOD_SHAPE.radialJitter;
        const secondaryNoise = (random() * 2 - 1) * FOOD_SHAPE.radialJitter * 0.35;
        const radius = Math.max(0.62, 1.0 + noise + secondaryNoise);
        points.push({x: Math.cos(angle) * radius, y: Math.sin(angle) * radius});
    }
    const path = new Path2D();
    const first = midpoint(points[points.length - 1], points[0]);
    path.moveTo(first.x, first.y);
    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        const mid = midpoint(current, next);
        path.quadraticCurveTo(current.x, current.y, mid.x, mid.y);
    }
    path.closePath();
    return path;
}

function midpoint(a, b) {
    return {x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5};
}

function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : Number(fallback) || 0;
}

function clamp(value, min, max) {
    if (!Number.isFinite(Number(value))) return min;
    return Math.max(min, Math.min(max, Number(value)));
}


