import { cssVar } from "../core/utils.js";
import { drawAnimatedDashedCircle } from "./dashed-ring.js";

const BG_DARK = 40;
const BG_LIGHT = 200;
const BG_MAX = 255;

// Separate palette for Light & Density view only. It keeps absolute darkness
// cold and visible instead of collapsing to pure black.
const OPTICAL_DENSITY_BG_DARK = Object.freeze({ r: 34, g: 38, b: 46 });
const OPTICAL_DENSITY_BG_MAX = Object.freeze({ r: 255, g: 255, b: 255 });
const LIGHT_OVEREXPOSURE_YELLOW = Object.freeze({ r: 255, g: 238, b: 120 });
const OPTICAL_DENSITY_LOW_LIGHT_GAMMA = 0.8;
const OPTICAL_DENSITY_LOW_LIGHT_TOE = 0.08;
const OPTICAL_DENSITY_OVEREXPOSURE_MAX = 2.0;

// Opacity visualization is intentionally independent from scene illumination.
// It keeps cell optical density readable even when high turbidity makes the whole
// background dark/cold. Dynamic log normalization avoids hard saturation.
const OPTICAL_DENSITY_FILTER = Object.freeze({
    curve: 10.0,
    minRange: 0.015,
    alphaMin: 0.04,
    ambientAlphaMax: 0.38,
    alphaMax: 0.76,
    blue: Object.freeze({ r: 35, g: 95, b: 255 }),
});


const LIGHT_DIRECTION_LAYER = Object.freeze({
    stroke: "#4ade80",
    strokeSoft: "rgba(74, 222, 128, 0.22)",
    pointFill: "rgba(74, 222, 128, 0.58)",
    lineWidth: 1.25,
    glowLineWidth: 3.2,
    glowAlpha: 0.15,
    minLengthFactor: 0.14,
    maxLengthFactor: 2.85,
    headLength: 5.0,
    headWidth: 3.25,
    pointRadius: 1.25,
    minHeadStrength: 0.11,
    alphaMin: 0.20,
    alphaMax: 0.86,
    bucketCount: 4,
});

const SPATIAL_GRID = Object.freeze({
    lineWidth: 0.85,
    maxBrightnessSamples: 64,
    lightSceneThreshold: 185,
    lightStrokeVar: "--c-text-on",
    darkStrokeVar: "--c-bg-deep",
    lightAlpha: 0.58,
    darkAlpha: 0.62,
});

const SPATIAL_GRID_SEARCH_RADIUS = Object.freeze({
    lineWidth: 1.2,
    dashFraction: 8 / 13,
    targetSegmentLength: 13.0,
    minSegments: 12,
    rotationsPerSecond: 0.11,
    strokeVar: "--c-warning",
});

const spatialGridStrokeColorCache = new Map();

const backgroundRasterCache = createRasterCache();
const opacityOverlayRasterCache = createRasterCache();
const lightLayerRasterCache = createRasterCache();
const fallbackRasterCache = createRasterCache();

function backgroundValue(illumination) {
    const illum = Math.max(0, illumination);

    if (illum <= 1) {
        return Math.round(BG_DARK + (BG_LIGHT - BG_DARK) * illum);
    }

    const linearSlope = BG_LIGHT - BG_DARK;
    const whiteGap = BG_MAX - BG_LIGHT;
    const k = linearSlope / whiteGap;

    return Math.round(
        BG_LIGHT + whiteGap * (1 - Math.exp(-k * (illum - 1)))
    );
}

function opticalDensityBackgroundColor(illumination) {
    const illum = Math.max(0, illumination);

    if (illum <= 1) {
        // Toe + gamma keeps 0% -> 1% smooth while still separating low light levels.
        const t = opticalDensityLowLightTone(illum);
        return mixRgb(OPTICAL_DENSITY_BG_DARK, OPTICAL_DENSITY_BG_MAX, t);
    }

    // 100% stays white, 150% is a clear intermediate warm shade, 200% is yellow.
    const t = clamp01((illum - 1) / (OPTICAL_DENSITY_OVEREXPOSURE_MAX - 1));
    return mixRgb(OPTICAL_DENSITY_BG_MAX, LIGHT_OVEREXPOSURE_YELLOW, t);
}

function opticalDensityLowLightTone(illumination) {
    const illum = clamp01(illumination);
    const toe = OPTICAL_DENSITY_LOW_LIGHT_TOE;
    const gamma = OPTICAL_DENSITY_LOW_LIGHT_GAMMA;
    const min = Math.pow(toe, gamma);
    const max = Math.pow(1.0 + toe, gamma);

    return clamp01((Math.pow(illum + toe, gamma) - min) / Math.max(1.0e-9, max - min));
}

function mixRgb(from, to, t) {
    return {
        r: Math.round(from.r + (to.r - from.r) * t),
        g: Math.round(from.g + (to.g - from.g) * t),
        b: Math.round(from.b + (to.b - from.b) * t),
    };
}

export function drawBackground(ctx, lighting, options = {}) {
    const lightMap = lighting?.lightMap ?? [];
    const cols = lighting?.gridWidth ?? 0;
    const rows = lighting?.gridHeight ?? 0;

    const W = Math.max(1, Number(options.worldWidth) || ctx.canvas.width);
    const H = Math.max(1, Number(options.worldHeight) || ctx.canvas.height);
    const opticalDensityMode = Boolean(options.opticalDensityMode);

    if (!lightMap.length || cols <= 0 || rows <= 0) {
        const globalLight = lighting?.globalLight ?? 0.75;
        const color = opticalDensityMode
            ? opticalDensityBackgroundColor(globalLight)
            : grayscaleBackgroundColor(globalLight);

        ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
        ctx.fillRect(0, 0, W, H);
        return;
    }

    const globalLight = lighting?.globalLight ?? 0.75;
    const cacheKey = `${cols}x${rows}|${opticalDensityMode ? "od" : "normal"}|${globalLight}`;
    const offscreen = getCachedGridCanvas(
        backgroundRasterCache,
        lightMap,
        cacheKey,
        cols,
        rows,
        (idx, data, dataIdx) => {
            const color = opticalDensityMode
                ? opticalDensityBackgroundColor(lightMap[idx] ?? globalLight)
                : grayscaleBackgroundColor(lightMap[idx] ?? globalLight);

            data[dataIdx] = color.r;
            data[dataIdx + 1] = color.g;
            data[dataIdx + 2] = color.b;
            data[dataIdx + 3] = 255;
        }
    );

    ctx.save();
    ctx.imageSmoothingEnabled = !opticalDensityMode;
    if (!opticalDensityMode) {
        ctx.imageSmoothingQuality = "medium";
    }
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.restore();
}

function grayscaleBackgroundColor(illumination) {
    const v = backgroundValue(illumination);
    return { r: v, g: v, b: v };
}

export function drawDisplayLayers(ctx, lighting, displayLayers, options = {}) {
    if (!lighting || !displayLayers) return;

    const combinedLightLayer = combinedDisplayLightMap(lighting, displayLayers);
    if (combinedLightLayer) {
        applyDiagnosticLightGrid(ctx, lighting, combinedLightLayer.map, options, combinedLightLayer.id);
    }

    const hasOpacityMap = displayLayers.opacityMap
        && Array.isArray(lighting.opacityMap)
        && lighting.opacityMap.length > 0;

    if (hasOpacityMap) {
        applyOpticalDensityFilter(ctx, lighting, options);
    }

    if (displayLayers.lightDirection) {
        drawLightDirectionLayer(ctx, lighting);
    }

    if (displayLayers.spatialGrid) {
        drawSpatialGrid(ctx, lighting, displayLayers);
        drawSpatialGridSearchRadius(ctx, options.spatialGridSearchCircle);
    }
}

function combinedDisplayLightMap(lighting, displayLayers) {
    const directed = displayLayers.directedLightMap && Array.isArray(lighting?.directedLightMap)
        ? lighting.directedLightMap
        : null;
    const scattered = displayLayers.scatteredLightMap && Array.isArray(lighting?.scatteredLightMap)
        ? lighting.scatteredLightMap
        : null;

    if (directed && directed.length > 0 && scattered && scattered.length > 0) {
        const total = Array.isArray(lighting?.lightMap) && lighting.lightMap.length > 0
            ? lighting.lightMap
            : directed;
        return { map: total, id: "directed+scattered" };
    }

    if (directed && directed.length > 0) {
        return { map: directed, id: "directed" };
    }

    if (scattered && scattered.length > 0) {
        return { map: scattered, id: "scattered" };
    }

    return null;
}

function applyDiagnosticLightGrid(ctx, lighting, lightMap, options = {}, id = "light") {
    const cols = lighting?.gridWidth ?? 0;
    const rows = lighting?.gridHeight ?? 0;
    if (!Array.isArray(lightMap) || lightMap.length === 0 || cols <= 0 || rows <= 0) return;

    const globalLight = lighting?.globalLight ?? 0.75;
    const offscreen = getCachedGridCanvas(
        lightLayerRasterCache,
        lightMap,
        `${cols}x${rows}|diagnostic-light|${id}|${globalLight}`,
        cols,
        rows,
        (idx, data, dataIdx) => {
            const color = opticalDensityBackgroundColor(lightMap[idx] ?? 0.0);
            data[dataIdx] = color.r;
            data[dataIdx + 1] = color.g;
            data[dataIdx + 2] = color.b;
            data[dataIdx + 3] = 255;
        }
    );

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = false;
    const W = Math.max(1, Number(options.worldWidth) || ctx.canvas.width);
    const H = Math.max(1, Number(options.worldHeight) || ctx.canvas.height);
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.restore();
}

function applyOpticalDensityFilter(ctx, lighting, options = {}) {
    const opacityMap = lighting?.opacityMap ?? [];
    const cols = lighting?.gridWidth ?? 0;
    const rows = lighting?.gridHeight ?? 0;
    if (!opacityMap.length || cols <= 0 || rows <= 0) return;

    const range = opticalDensityToneRange(opacityMap);
    const offscreen = getCachedGridCanvas(
        opacityOverlayRasterCache,
        opacityMap,
        `${cols}x${rows}|od-overlay|${range.minTone.toFixed(4)}|${range.maxTone.toFixed(4)}|${range.ambientAlpha.toFixed(3)}`,
        cols,
        rows,
        (idx, data, dataIdx) => {
            const t = opticalDensityTone(opacityMap[idx] ?? 0, range);
            const rawTone = rawOpticalDensityTone(opacityMap[idx] ?? 0);
            const alpha = rawTone <= 0.0
                ? 0.0
                : range.ambientAlpha
                    + t * (OPTICAL_DENSITY_FILTER.alphaMax - range.ambientAlpha);

            data[dataIdx] = OPTICAL_DENSITY_FILTER.blue.r;
            data[dataIdx + 1] = OPTICAL_DENSITY_FILTER.blue.g;
            data[dataIdx + 2] = OPTICAL_DENSITY_FILTER.blue.b;
            data[dataIdx + 3] = Math.round(255 * clamp01(alpha));
        }
    );

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = false;
    const W = Math.max(1, Number(options.worldWidth) || ctx.canvas.width);
    const H = Math.max(1, Number(options.worldHeight) || ctx.canvas.height);
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.restore();
}

function opticalDensityToneRange(opacityMap) {
    let minTone = Infinity;
    let maxTone = -Infinity;

    for (const value of opacityMap) {
        const tone = rawOpticalDensityTone(value);
        if (tone < minTone) minTone = tone;
        if (tone > maxTone) maxTone = tone;
    }

    if (!Number.isFinite(minTone) || !Number.isFinite(maxTone)) {
        return { minTone: 0.0, maxTone: 1.0, ambientAlpha: 0.0 };
    }

    if (maxTone - minTone < OPTICAL_DENSITY_FILTER.minRange) {
        maxTone = minTone + OPTICAL_DENSITY_FILTER.minRange;
    }

    const normalizedMin = clamp01(minTone / Math.log1p(OPTICAL_DENSITY_FILTER.curve));
    const ambientAlpha = OPTICAL_DENSITY_FILTER.alphaMin
        + normalizedMin * (OPTICAL_DENSITY_FILTER.ambientAlphaMax - OPTICAL_DENSITY_FILTER.alphaMin);

    return { minTone, maxTone, ambientAlpha };
}

function opticalDensityTone(opacity, range) {
    const tone = rawOpticalDensityTone(opacity);
    return clamp01((tone - range.minTone) / Math.max(1.0e-9, range.maxTone - range.minTone));
}

function rawOpticalDensityTone(opacity) {
    return Math.log1p(Math.max(0.0, opacity) * OPTICAL_DENSITY_FILTER.curve);
}

function drawOpacityFallback(ctx, lighting) {
    const opacityMap = lighting?.opacityMap ?? [];
    const cols = lighting?.gridWidth ?? 0;
    const rows = lighting?.gridHeight ?? 0;

    drawGridImage(ctx, cols, rows, (idx, data, dataIdx) => {
        const t = clamp01(rawOpticalDensityTone(opacityMap[idx] ?? 0));
        data[dataIdx] = 0;
        data[dataIdx + 1] = 0;
        data[dataIdx + 2] = 255;
        data[dataIdx + 3] = Math.round(180 * t);
    }, { imageSmoothingEnabled: false });
}

function drawGridImage(ctx, cols, rows, fillPixel, options = {}) {
    const offscreen = getCachedGridCanvas(
        fallbackRasterCache,
        null,
        `${cols}x${rows}|fallback`,
        cols,
        rows,
        fillPixel
    );

    ctx.save();
    ctx.imageSmoothingEnabled = options.imageSmoothingEnabled ?? true;
    if (ctx.imageSmoothingEnabled) {
        ctx.imageSmoothingQuality = "medium";
    }
    const W = Math.max(1, Number(options.worldWidth) || ctx.canvas.width);
    const H = Math.max(1, Number(options.worldHeight) || ctx.canvas.height);
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.restore();
}

function createRasterCache() {
    return {
        canvas: null,
        ctx: null,
        imageData: null,
        cacheKey: null,
        sourceArray: null,
        cols: 0,
        rows: 0,
    };
}

function getCachedGridCanvas(cache, sourceArray, cacheKey, cols, rows, fillPixel) {
    const sameSource = sourceArray != null && cache.sourceArray === sourceArray;
    const sameStaticFallback = sourceArray == null && cache.sourceArray == null;

    if (cache.canvas
        && cache.cacheKey === cacheKey
        && cache.cols === cols
        && cache.rows === rows
        && (sameSource || sameStaticFallback)) {
        return cache.canvas;
    }

    ensureRasterSize(cache, cols, rows);
    fillRaster(cache, cols, rows, fillPixel);

    cache.cacheKey = cacheKey;
    cache.sourceArray = sourceArray;
    cache.cols = cols;
    cache.rows = rows;

    return cache.canvas;
}

function ensureRasterSize(cache, cols, rows) {
    if (!cache.canvas) {
        cache.canvas = document.createElement("canvas");
        cache.ctx = cache.canvas.getContext("2d");
    }

    if (cache.canvas.width !== cols || cache.canvas.height !== rows) {
        cache.canvas.width = cols;
        cache.canvas.height = rows;
        cache.imageData = null;
    }

    if (!cache.imageData) {
        cache.imageData = cache.ctx.createImageData(cols, rows);
    }
}

function fillRaster(cache, cols, rows, fillPixel) {
    const data = cache.imageData.data;

    for (let idx = 0; idx < cols * rows; idx++) {
        fillPixel(idx, data, idx * 4);
    }

    cache.ctx.putImageData(cache.imageData, 0, 0);
}


function drawLightDirectionLayer(ctx, lighting) {
    const arrows = Array.isArray(lighting?.lightDirectionArrows)
        ? lighting.lightDirectionArrows
        : [];
    if (!arrows.length) return;

    const packed = typeof arrows[0] === "number";
    const count = packed
        ? Math.floor(arrows.length / 5)
        : arrows.length;
    if (count <= 0) return;

    const gridStep = Math.max(1, lighting?.gridStep ?? 1);

    ctx.save();
    ctx.lineCap = "butt";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 0;

    drawLightDirectionStrokePass(ctx, arrows, count, packed, gridStep, -1, true);

    for (let bucket = 0; bucket < LIGHT_DIRECTION_LAYER.bucketCount; bucket++) {
        drawLightDirectionStrokePass(ctx, arrows, count, packed, gridStep, bucket, false);
        drawLightDirectionHeadPass(ctx, arrows, count, packed, gridStep, bucket);
    }

    drawLightDirectionPointPass(ctx, arrows, count, packed, gridStep);

    ctx.restore();
}

function drawLightDirectionStrokePass(ctx, arrows, count, packed, gridStep, bucket, glow) {
    const minLength = gridStep * LIGHT_DIRECTION_LAYER.minLengthFactor;
    const maxLength = gridStep * LIGHT_DIRECTION_LAYER.maxLengthFactor;
    const pointLimit = gridStep * 0.35;
    let hasPath = false;

    ctx.beginPath();

    for (let i = 0; i < count; i++) {
        const strength = clamp01(readLightDirectionArrow(arrows, packed, i, 4));
        if (!glow && lightDirectionBucket(strength) !== bucket) continue;

        const dirX = Number(readLightDirectionArrow(arrows, packed, i, 2)) || 0;
        const dirY = Number(readLightDirectionArrow(arrows, packed, i, 3)) || 0;
        const magnitude = Math.hypot(dirX, dirY);
        if (magnitude <= 1.0e-6) continue;

        const eased = smoothstep(strength);
        const length = minLength + (maxLength - minLength) * eased;
        if (length <= pointLimit) continue;

        const nx = dirX / magnitude;
        const ny = dirY / magnitude;
        const cx = Number(readLightDirectionArrow(arrows, packed, i, 0)) || 0;
        const cy = Number(readLightDirectionArrow(arrows, packed, i, 1)) || 0;

        const tipX = cx + nx * length * 0.5;
        const tipY = cy + ny * length * 0.5;
        const headLength = lightDirectionHeadLength(strength);
        if (length <= headLength + 0.5) continue;

        ctx.moveTo(cx - nx * length * 0.5, cy - ny * length * 0.5);
        ctx.lineTo(tipX - nx * headLength, tipY - ny * headLength);
        hasPath = true;
    }

    if (!hasPath) return;

    if (glow) {
        ctx.globalAlpha = LIGHT_DIRECTION_LAYER.glowAlpha;
        ctx.strokeStyle = LIGHT_DIRECTION_LAYER.strokeSoft;
        ctx.lineWidth = LIGHT_DIRECTION_LAYER.glowLineWidth;
    } else {
        const bucketStrength = (bucket + 1) / LIGHT_DIRECTION_LAYER.bucketCount;
        const eased = smoothstep(bucketStrength);
        ctx.globalAlpha = LIGHT_DIRECTION_LAYER.alphaMin
            + (LIGHT_DIRECTION_LAYER.alphaMax - LIGHT_DIRECTION_LAYER.alphaMin) * eased;
        ctx.strokeStyle = LIGHT_DIRECTION_LAYER.stroke;
        ctx.lineWidth = LIGHT_DIRECTION_LAYER.lineWidth;
    }

    ctx.stroke();
}

function drawLightDirectionHeadPass(ctx, arrows, count, packed, gridStep, bucket) {
    const minLength = gridStep * LIGHT_DIRECTION_LAYER.minLengthFactor;
    const maxLength = gridStep * LIGHT_DIRECTION_LAYER.maxLengthFactor;
    let hasPath = false;

    ctx.beginPath();

    for (let i = 0; i < count; i++) {
        const strength = clamp01(readLightDirectionArrow(arrows, packed, i, 4));
        if (strength < LIGHT_DIRECTION_LAYER.minHeadStrength) continue;
        if (lightDirectionBucket(strength) !== bucket) continue;

        const dirX = Number(readLightDirectionArrow(arrows, packed, i, 2)) || 0;
        const dirY = Number(readLightDirectionArrow(arrows, packed, i, 3)) || 0;
        const magnitude = Math.hypot(dirX, dirY);
        if (magnitude <= 1.0e-6) continue;

        const nx = dirX / magnitude;
        const ny = dirY / magnitude;
        const eased = smoothstep(strength);
        const length = minLength + (maxLength - minLength) * eased;
        const cx = Number(readLightDirectionArrow(arrows, packed, i, 0)) || 0;
        const cy = Number(readLightDirectionArrow(arrows, packed, i, 1)) || 0;
        const headX = cx + nx * length * 0.5;
        const headY = cy + ny * length * 0.5;

        appendArrowHeadPath(ctx, headX, headY, nx, ny, strength);
        hasPath = true;
    }

    if (!hasPath) return;

    const bucketStrength = (bucket + 1) / LIGHT_DIRECTION_LAYER.bucketCount;
    const eased = smoothstep(bucketStrength);
    ctx.globalAlpha = LIGHT_DIRECTION_LAYER.alphaMin
        + (LIGHT_DIRECTION_LAYER.alphaMax - LIGHT_DIRECTION_LAYER.alphaMin) * eased;
    ctx.fillStyle = LIGHT_DIRECTION_LAYER.stroke;
    ctx.fill();
}

function drawLightDirectionPointPass(ctx, arrows, count, packed, gridStep) {
    const minLength = gridStep * LIGHT_DIRECTION_LAYER.minLengthFactor;
    const maxLength = gridStep * LIGHT_DIRECTION_LAYER.maxLengthFactor;
    const pointLimit = gridStep * 0.35;
    let hasPath = false;

    ctx.beginPath();

    for (let i = 0; i < count; i++) {
        const strength = clamp01(readLightDirectionArrow(arrows, packed, i, 4));
        const length = minLength + (maxLength - minLength) * smoothstep(strength);
        if (length > pointLimit) continue;

        const cx = Number(readLightDirectionArrow(arrows, packed, i, 0)) || 0;
        const cy = Number(readLightDirectionArrow(arrows, packed, i, 1)) || 0;
        ctx.moveTo(cx + LIGHT_DIRECTION_LAYER.pointRadius, cy);
        ctx.arc(cx, cy, LIGHT_DIRECTION_LAYER.pointRadius, 0, Math.PI * 2);
        hasPath = true;
    }

    if (!hasPath) return;

    ctx.globalAlpha = LIGHT_DIRECTION_LAYER.alphaMin;
    ctx.fillStyle = LIGHT_DIRECTION_LAYER.pointFill;
    ctx.fill();
}

function appendArrowHeadPath(ctx, x, y, dirX, dirY, strength) {
    const headLength = lightDirectionHeadLength(strength);
    const headWidth = lightDirectionHeadWidth(strength);
    const baseX = x - dirX * headLength;
    const baseY = y - dirY * headLength;
    const perpX = -dirY;
    const perpY = dirX;

    ctx.moveTo(x, y);
    ctx.lineTo(baseX + perpX * headWidth, baseY + perpY * headWidth);
    ctx.lineTo(baseX - perpX * headWidth, baseY - perpY * headWidth);
    ctx.closePath();
}

function lightDirectionHeadLength(strength) {
    return LIGHT_DIRECTION_LAYER.headLength * (0.65 + 0.35 * clamp01(strength));
}

function lightDirectionHeadWidth(strength) {
    return LIGHT_DIRECTION_LAYER.headWidth * (0.75 + 0.25 * clamp01(strength));
}

function readLightDirectionArrow(arrows, packed, index, field) {
    if (packed) {
        return arrows[index * 5 + field];
    }

    const arrow = arrows[index];
    if (!arrow) return 0;
    switch (field) {
        case 0: return arrow.x;
        case 1: return arrow.y;
        case 2: return arrow.dx;
        case 3: return arrow.dy;
        case 4: return arrow.strength;
        default: return 0;
    }
}

function lightDirectionBucket(strength) {
    return Math.max(0, Math.min(
        LIGHT_DIRECTION_LAYER.bucketCount - 1,
        Math.floor(clamp01(strength) * LIGHT_DIRECTION_LAYER.bucketCount)
    ));
}

function smoothstep(value) {
    const t = clamp01(value);
    return t * t * (3 - 2 * t);
}

function drawSpatialGrid(ctx, lighting, displayLayers = {}) {
    const gridCells = Array.isArray(lighting?.spatialGridCells) ? lighting.spatialGridCells : [];
    if (!gridCells.length) return;

    const sceneBrightness = estimateSceneBrightness(lighting, displayLayers);
    const lightScene = sceneBrightness >= SPATIAL_GRID.lightSceneThreshold;

    ctx.save();
    ctx.strokeStyle = spatialGridStrokeColor(
        lightScene ? SPATIAL_GRID.darkStrokeVar : SPATIAL_GRID.lightStrokeVar
    );
    ctx.globalAlpha = lightScene ? SPATIAL_GRID.darkAlpha : SPATIAL_GRID.lightAlpha;
    ctx.lineWidth = SPATIAL_GRID.lineWidth;
    ctx.setLineDash([]);

    ctx.beginPath();
    for (const cell of gridCells) {
        ctx.rect(cell.x, cell.y, cell.width, cell.height);
    }
    ctx.stroke();

    ctx.restore();
}

function drawSpatialGridSearchRadius(ctx, circle) {
    const x = Number(circle?.x);
    const y = Number(circle?.y);
    const radius = Number(circle?.radius);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius <= 0) {
        return;
    }

    drawAnimatedDashedCircle(ctx, {
        x,
        y,
        radius,
        strokeStyle: spatialGridStrokeColor(SPATIAL_GRID_SEARCH_RADIUS.strokeVar),
        lineWidth: SPATIAL_GRID_SEARCH_RADIUS.lineWidth,
        lineCap: "round",
        dashFraction: SPATIAL_GRID_SEARCH_RADIUS.dashFraction,
        targetSegmentLength: SPATIAL_GRID_SEARCH_RADIUS.targetSegmentLength,
        minSegments: SPATIAL_GRID_SEARCH_RADIUS.minSegments,
        rotationsPerSecond: SPATIAL_GRID_SEARCH_RADIUS.rotationsPerSecond,
        rotationDirection: "counterclockwise",
    });
}

function spatialGridStrokeColor(varName) {
    if (!spatialGridStrokeColorCache.has(varName)) {
        spatialGridStrokeColorCache.set(varName, cssVar(varName));
    }

    return spatialGridStrokeColorCache.get(varName);
}

function estimateSceneBrightness(lighting, displayLayers = {}) {
    const lightMap = lighting?.lightMap ?? [];
    const cols = lighting?.gridWidth ?? 0;
    const rows = lighting?.gridHeight ?? 0;

    if (!Array.isArray(lightMap) || lightMap.length === 0 || cols <= 0 || rows <= 0) {
        return backgroundValue(lighting?.globalLight ?? 0.75);
    }

    const sampleLimit = Math.max(1, SPATIAL_GRID.maxBrightnessSamples);
    const sampleStride = Math.max(1, Math.ceil(lightMap.length / sampleLimit));
    const opacityMap = displayLayers.opacityMap && Array.isArray(lighting?.opacityMap)
        ? lighting.opacityMap
        : null;

    let sum = 0;
    let count = 0;

    for (let idx = 0; idx < lightMap.length; idx += sampleStride) {
        const light = Number.isFinite(lightMap[idx])
            ? lightMap[idx]
            : lighting?.globalLight ?? 0.75;

        sum += opacityMap
            ? opticalDensityCompositedBrightness(light, opacityMap[idx] ?? 0)
            : backgroundValue(light);
        count++;
    }

    return count > 0 ? sum / count : backgroundValue(lighting?.globalLight ?? 0.75);
}

function opticalDensityCompositedBrightness(light, opacity) {
    const color = opticalDensityBackgroundColor(light);
    const density = clamp01(rawOpticalDensityTone(opacity ?? 0) / Math.log1p(OPTICAL_DENSITY_FILTER.curve));
    const alpha = density <= 0.0
        ? 0.0
        : OPTICAL_DENSITY_FILTER.alphaMin
            + density * (OPTICAL_DENSITY_FILTER.alphaMax - OPTICAL_DENSITY_FILTER.alphaMin);

    const r = color.r * (1 - alpha) + OPTICAL_DENSITY_FILTER.blue.r * alpha;
    const g = color.g * (1 - alpha) + OPTICAL_DENSITY_FILTER.blue.g * alpha;
    const b = color.b * (1 - alpha) + OPTICAL_DENSITY_FILTER.blue.b * alpha;

    return r * 0.299 + g * 0.587 + b * 0.114;
}

function clamp01(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

export function drawLightSourceBodies(ctx, lighting) {
    const sources = Array.isArray(lighting?.sources)
        ? lighting.sources
        : [];

    if (!sources.length) return;

    for (const source of sources) {
        ctx.save();

        const renderType = String(
            source.renderType ?? source.type ?? ""
        ).toUpperCase();

        if (renderType === "EDGE" || renderType === "WALL") {
            drawTrapezoidSource(ctx, source);
        } else {
            drawCircleSource(ctx, source);
        }

        ctx.restore();
    }
}

const CIRCLE_SOURCE_OUTER_RADIUS = 10;
const CIRCLE_SOURCE_INNER_RADIUS = 7;
const CIRCLE_SOURCE_CORE_RADIUS = 5;
const WALL_SOURCE_OUTER_WIDTH = 16;
const WALL_SOURCE_INNER_WIDTH = 12;
const WALL_SOURCE_DEPTH = 6;

function drawCircleSource(ctx, source) {
    const cx = source.x;
    const cy = source.y;

    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_SOURCE_OUTER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(226,232,240)';
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(148,163,184,0.95)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_SOURCE_INNER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(241,245,249)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_SOURCE_CORE_RADIUS, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
}

function drawTrapezoidSource(ctx, source) {
    const b = source.brightness ?? 1.0;
    const outwardAngle = source.angle ?? 0;
    const inwardAngle = outwardAngle + Math.PI;
    const perpAngle = outwardAngle + Math.PI / 2;

    const outerW = WALL_SOURCE_OUTER_WIDTH;
    const innerW = WALL_SOURCE_INNER_WIDTH;
    const depth = WALL_SOURCE_DEPTH;
    const cx = source.x, cy = source.y;
    const dx = Math.cos(perpAngle), dy = Math.sin(perpAngle);
    const ix = Math.cos(inwardAngle), iy = Math.sin(inwardAngle);

    ctx.beginPath();
    ctx.moveTo(cx - dx * outerW, cy - dy * outerW);
    ctx.lineTo(cx + dx * outerW, cy + dy * outerW);
    ctx.lineTo(cx + dx * innerW + ix * depth, cy + dy * innerW + iy * depth);
    ctx.lineTo(cx - dx * innerW + ix * depth, cy - dy * innerW + iy * depth);
    ctx.closePath();

    ctx.fillStyle = 'rgb(226,232,240)';
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(148,163,184,0.95)';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - dx * innerW * 0.65 + ix * depth * 0.55, cy - dy * innerW * 0.65 + iy * depth * 0.55);
    ctx.lineTo(cx + dx * innerW * 0.65 + ix * depth * 0.55, cy + dy * innerW * 0.65 + iy * depth * 0.55);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
}


