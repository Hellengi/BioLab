import { drawDeadCellEffects, updateDeadCellEffects } from "./effects.js";
import { drawBackground, drawDisplayLayers, drawLightSourceBodies } from "./lighting.js";
import { ORGANIC_BROWN_COLOR } from "./colors.js";
import { clamp01, grayscaleRgb, hash01, hsla, organicBrownHsla, rgb, seededRandom, smoothstep } from "./render-utils.js";
import { buildCapturedFoodSlotMap, drawBiologyCell } from "./cell-renderer.js";
import { cssVar } from "../core/utils.js";
import { getCanvasCameraState, getVisibleWorldBounds } from "../ui/panels/canvas-camera.js";


const CELL_MIN_LIGHT = 0.38;

const CELL_RADIAL_ALPHA = Object.freeze({
    centerFactor: 0.52,
    midFactor: 0.76,
    edgeFactor: 1.06,
    edgeStop: 0.92,
});


const FOOD_SHAPE = Object.freeze({
    pointCount: 13,
    radialJitter: 0.24,
    cacheLimit: 6000,
});

// Food color is still the same organic-brown hue and the edge still uses the
// same light-dependent darkening as before. Only the fill is now radial:
// the center remains readable in darkness while the rim keeps the physical
// light/shadow response. The gradient is built in normalized food-local
// coordinates, so it stays cheap even with many food particles.
const FOOD_INNER_BODY = Object.freeze({
    scale: 0.52,
    mainAlpha: 0.92,
    innerAlpha: 0.88,
    darkeningFactor: 0.50,
});

// Strength and shape of cosmetic cell highlights/shadows.
// These constants intentionally live in one place, so the visual effect can be tuned
// without touching the renderer logic. Higher alpha/gradientScale = brighter crescents.

const CELL_DIRECTION_VECTOR = Object.freeze({
    length: 12.0,
    strokeStyle: "#ff8c42",
    lineWidth: 1.5,
    headLength: 5.2,
    headWidth: 4.2,
    shaftHeadOverlap: 1.35,
});
const selectionStrokeColorCache = new Map();
const foodPathCache = new Map();

const OPTICAL_DENSITY_BG_DARK = Object.freeze({ r: 34, g: 38, b: 46 });
const OPTICAL_DENSITY_BG_MAX = Object.freeze({ r: 255, g: 255, b: 255 });
const LIGHT_OVEREXPOSURE_YELLOW = Object.freeze({ r: 255, g: 238, b: 120 });
const OPTICAL_DENSITY_LOW_LIGHT_GAMMA = 0.8;
const OPTICAL_DENSITY_LOW_LIGHT_TOE = 0.08;
const OPTICAL_DENSITY_OVEREXPOSURE_MAX = 2.0;

const SELECTED_CELL_RING = Object.freeze({
    padding: 4.0,
    width: 1.35,
    dashFraction: 0.56,
    targetSegmentLength: 38.0,
    minSegments: 8,
    rotationsPerSecond: 0.09,
    darkBackgroundThreshold: 105,
    lightBackgroundThreshold: 165,
    darkStrokeVar: "--c-accent-dark",
    midStrokeVar: "--c-accent-dark",
    lightStrokeVar: "--c-accent",
});

export function render(ctx, state) {
    if (!state.world || !state.config) return;

    const worldAnimationTime = Number.isFinite(Number(state.world.time)) ? Number(state.world.time) : 0;
    const camera = getCanvasCameraState();
    const worldSize = Math.max(1, Number(state.config.tubeDiameter) || camera.worldWidth || 1);
    const visibleBounds = getVisibleWorldBounds(96);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.save();
    ctx.setTransform(
        camera.dpr * camera.zoom,
        0,
        0,
        camera.dpr * camera.zoom,
        camera.dpr * camera.x,
        camera.dpr * camera.y
    );

    clipTube(ctx, worldSize);

    const opticalDensityLayerEnabled = hasOpticalDensityLayer(state);

    drawBackground(ctx, state.world.lighting, {
        opticalDensityMode: opticalDensityLayerEnabled,
        worldWidth: worldSize,
        worldHeight: worldSize,
    });

    if (state.world.lighting) {
        drawLightSourceBodies(ctx, state.world.lighting);
    }

    for (const food of state.world.foods) {
        if (food.capturedByCellId == null && isCircleVisible(food, visibleBounds, 8)) {
            drawFood(ctx, food, state.world.lighting, opticalDensityLayerEnabled);
        }
    }

    // Light & Density view already visualizes cells through the optical-density map.
    // Do not draw the cell bodies over it, otherwise the actual density layer is harder to read.
    if (!opticalDensityLayerEnabled) {
        const capturedFoods = buildCapturedFoodSlotMap(state.world.foods);
        for (const cell of state.world.cells) {
            if (cell.dead || !isCircleVisible(cell, visibleBounds, 24)) continue;
            drawCell(ctx, cell, state.world.lighting, false, capturedFoods, camera, worldAnimationTime, visibleBounds);
        }
        for (const deadCell of state.world.cells) {
            if (!deadCell.dead || !isCircleVisible(deadCell, visibleBounds, 24)) continue;
            drawDeadCell(ctx, deadCell, state.world.lighting, false, capturedFoods, camera, worldAnimationTime, visibleBounds);
        }
        updateDeadCellEffects();
        drawDeadCellEffects(ctx, false);
    } else {
        updateDeadCellEffects();
    }

    drawDisplayLayers(ctx, state.world.lighting, state.displayLayers, {
        worldWidth: worldSize,
        worldHeight: worldSize,
    });
    drawCellDirectionLayer(ctx, state, visibleBounds);

    ctx.restore();

    ctx.save();
    ctx.setTransform(
        camera.dpr * camera.zoom,
        0,
        0,
        camera.dpr * camera.zoom,
        camera.dpr * camera.x,
        camera.dpr * camera.y
    );

    drawTubeBorder(ctx, worldSize);

    // Selection ring is an interaction overlay, so it stays visible even when
    // Light & Density view hides the cell bodies.
    drawSelectedCellOverlay(ctx, state, opticalDensityLayerEnabled);
    ctx.restore();
}

function clipTube(ctx, worldSize) {
    const d = Math.max(1, Number(worldSize) || 1);
    const r = d / 2;

    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.clip();
}

function drawTubeBorder(ctx, worldSize) {
    const d = Math.max(1, Number(worldSize) || 1);
    const r = d / 2;

    ctx.beginPath();
    ctx.arc(r, r, r - 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(226,232,240,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
}


function isCircleVisible(object, bounds, extraPadding = 0) {
    if (!object || !bounds) return true;
    const radius = Math.max(0, Number(object.radius) || 0) + Math.max(0, Number(extraPadding) || 0);
    const x = Number(object.x) || 0;
    const y = Number(object.y) || 0;

    return x + radius >= bounds.minX
        && x - radius <= bounds.maxX
        && y + radius >= bounds.minY
        && y - radius <= bounds.maxY;
}

function drawFood(ctx, food, lighting, grayscaleMode = false) {
    if (food.consumed) return;

    const baseLightness = 33;
    const illum = objectIlluminance(food, lighting);
    const shadedLightness = modulateLightness(baseLightness, illum);

    // Inner body is not unshaded. It keeps the same food color, but receives only
    // half of the visual darkening. This makes food readable in darkness without
    // breaking the main light/shadow response of the full-size body.
    const innerLightness = Math.round(
        baseLightness - (baseLightness - shadedLightness) * FOOD_INNER_BODY.darkeningFactor
    );

    const mainFill = grayscaleMode
        ? `hsla(0, 0%, ${shadedLightness}%, ${FOOD_INNER_BODY.mainAlpha})`
        : organicBrownHsla(shadedLightness, FOOD_INNER_BODY.mainAlpha);

    const innerFill = grayscaleMode
        ? `hsla(0, 0%, ${innerLightness}%, ${FOOD_INNER_BODY.innerAlpha})`
        : organicBrownHsla(innerLightness, FOOD_INNER_BODY.innerAlpha);

    fillFoodShape(ctx, food, mainFill, 1.0);
    fillFoodShape(ctx, food, innerFill, FOOD_INNER_BODY.scale);
}

function drawCell(ctx, cell, lighting, grayscaleMode = false, capturedFoods = null, camera = null, animationTime = 0, visibleBounds = null) {
    drawBiologyCell(ctx, cell, {
        lighting,
        grayscale: grayscaleMode,
        capturedFoods,
        layerCount: 3,
        cacheStaticBase: true,
        renderScale: (camera?.zoom ?? 1) * (camera?.dpr ?? 1),
        animationTime,
        visibleBounds,
    });
}

function drawDeadCell(ctx, deadCell, lighting, grayscaleMode = false, capturedFoods = null, camera = null, animationTime = 0, visibleBounds = null) {
    const illum = cellIlluminance(deadCell, lighting);
    drawCell(ctx, deadCell, lighting, grayscaleMode, capturedFoods, camera, animationTime, visibleBounds);

    const l = modulateLightness(ORGANIC_BROWN_COLOR.l, illum);
    const overlayAlpha = clamp01(0.42 + Math.min(0.35, (deadCell.lifetimeTicks ?? 0) / 180));

    ctx.save();
    ctx.globalCompositeOperation = grayscaleMode ? "source-over" : "multiply";
    fillCellRadialHsl(
        ctx,
        deadCell.x,
        deadCell.y,
        deadCell.radius,
        ORGANIC_BROWN_COLOR.h,
        ORGANIC_BROWN_COLOR.s,
        l,
        overlayAlpha
    );
    ctx.restore();
}

function cellIlluminance(cell, lighting) {
    const rawLight = typeof cell.localLight === "number"
        ? cell.localLight
        : objectRawLight(cell, lighting, lighting?.globalLight ?? 0.75);

    return lightMultiplier(rawLight);
}

function objectIlluminance(object, lighting) {
    return lightMultiplier(objectRawLight(object, lighting, lighting?.globalLight ?? 0.75));
}

function objectRawLight(object, lighting, fallback) {
    return sampleLightingGrid(lighting?.lightMap, lighting, object.x, object.y, fallback);
}

function lightMultiplier(rawLight) {
    const clampedLight = Math.max(0, Math.min(1, rawLight));
    return CELL_MIN_LIGHT + clampedLight * (1 - CELL_MIN_LIGHT);
}

function modulateLightness(baseLightness, illuminance) {
    const minL = 5;
    return Math.round(minL + (baseLightness - minL) * illuminance);
}

function drawCellDirectionLayer(ctx, state, visibleBounds = null) {
    if (!state.displayLayers?.cellDirections) return;

    for (const cell of state.world.cells) {
        if (cell.dead) continue;
        if (visibleBounds && !isCircleVisible(cell, visibleBounds, CELL_DIRECTION_VECTOR.length + 4)) continue;
        drawDirectionVector(ctx, cell);
    }
}

function drawDirectionVector(ctx, cell) {
    const angleRad = Number.isFinite(cell.directionAngle)
        ? (cell.directionAngle - 90) * Math.PI / 180
        : null;
    const dirX = angleRad == null ? 0.0 : Math.cos(angleRad);
    const dirY = angleRad == null ? 0.0 : Math.sin(angleRad);
    if (dirX === 0.0 && dirY === 0.0) return;

    const startX = cell.x;
    const startY = cell.y;
    const endX = startX + dirX * CELL_DIRECTION_VECTOR.length;
    const endY = startY + dirY * CELL_DIRECTION_VECTOR.length;
    const angle = Math.atan2(dirY, dirX);

    const headLength = Math.min(
        CELL_DIRECTION_VECTOR.headLength,
        CELL_DIRECTION_VECTOR.length * 0.48
    );
    const headWidth = CELL_DIRECTION_VECTOR.headWidth;
    const shaftEndX = endX - Math.cos(angle) * Math.max(0.0, headLength - CELL_DIRECTION_VECTOR.shaftHeadOverlap);
    const shaftEndY = endY - Math.sin(angle) * Math.max(0.0, headLength - CELL_DIRECTION_VECTOR.shaftHeadOverlap);

    ctx.strokeStyle = CELL_DIRECTION_VECTOR.strokeStyle;
    ctx.fillStyle = CELL_DIRECTION_VECTOR.strokeStyle;
    ctx.lineWidth = CELL_DIRECTION_VECTOR.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(shaftEndX, shaftEndY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
        endX - Math.cos(angle) * headLength + Math.sin(angle) * headWidth * 0.5,
        endY - Math.sin(angle) * headLength - Math.cos(angle) * headWidth * 0.5
    );
    ctx.lineTo(
        endX - Math.cos(angle) * headLength - Math.sin(angle) * headWidth * 0.5,
        endY - Math.sin(angle) * headLength + Math.cos(angle) * headWidth * 0.5
    );
    ctx.closePath();
    ctx.fill();
}


function fillCellRadialHsl(targetCtx, x, y, radius, hue, saturation, lightness, alpha = 1.0) {
    const baseAlpha = clamp01(alpha);
    if (baseAlpha <= 0.0) return;

    const centerAlpha = clamp01(baseAlpha * CELL_RADIAL_ALPHA.centerFactor);
    const midAlpha = clamp01(baseAlpha * CELL_RADIAL_ALPHA.midFactor);
    const edgeAlpha = clamp01(baseAlpha * CELL_RADIAL_ALPHA.edgeFactor);

    const gradient = targetCtx.createRadialGradient(
        x,
        y,
        Math.max(0.0, radius * 0.04),
        x,
        y,
        radius
    );
    gradient.addColorStop(0.0, hsla(hue, saturation, lightness, centerAlpha));
    gradient.addColorStop(0.55, hsla(hue, saturation, lightness, midAlpha));
    gradient.addColorStop(CELL_RADIAL_ALPHA.edgeStop, hsla(hue, saturation, lightness, edgeAlpha));
    gradient.addColorStop(1.0, hsla(hue, saturation, lightness, edgeAlpha));

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.arc(x, y, radius, 0, Math.PI * 2);
    targetCtx.fillStyle = gradient;
    targetCtx.fill();
    targetCtx.restore();
}


function colorOpacity(color, fallback = 1.0) {
    const value = Number(color?.opacity ?? fallback);
    return clamp01(Number.isFinite(value) ? value : fallback);
}

function cellRenderAlpha(cell) {
    const realOpacity = Number(cell?.visual?.cellColor?.opacity ?? cell?.opacity ?? 1.0);
    if (!Number.isFinite(realOpacity) || realOpacity <= 0.0) {
        return 0.0;
    }
    return clamp01(realOpacity);
}

function modulateRgb(color, illum) {
    const i = clamp01(illum);
    const min = 24;
    return {
        r: Math.round(min + (Number(color?.r ?? 255) - min) * i),
        g: Math.round(min + (Number(color?.g ?? 255) - min) * i),
        b: Math.round(min + (Number(color?.b ?? 255) - min) * i),
    };
}

function fillFoodShape(ctx, food, fillStyle, scale = 1.0) {
    fillFoodShapeAt(ctx, food.id, food.x, food.y, food.radius, fillStyle, scale);
}

function fillFoodShapeAt(ctx, foodId, x, y, radius, fillStyle, scale = 1.0) {
    const path = foodPath(foodId);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(radius * scale, radius * scale);
    ctx.fillStyle = fillStyle;
    ctx.fill(path);
    ctx.restore();
}

function foodPath(foodId) {
    if (foodPathCache.has(foodId)) {
        return foodPathCache.get(foodId);
    }

    if (foodPathCache.size > FOOD_SHAPE.cacheLimit) {
        foodPathCache.clear();
    }

    const path = createFoodPath(foodId);
    foodPathCache.set(foodId, path);
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

        points.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
        });
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
    return {
        x: (a.x + b.x) * 0.5,
        y: (a.y + b.y) * 0.5,
    };
}

function drawSelectedCellOverlay(ctx, state, opticalDensityLayerEnabled) {
    if (!state.selectedCellId) return;

    const selectedCell = state.cellById.get(state.selectedCellId);
    if (!selectedCell) return;

    drawSelectedCellOutline(ctx, selectedCell, state.world?.lighting, opticalDensityLayerEnabled);
}

function drawSelectedCellOutline(ctx, selectedCell, lighting, opticalDensityLayerEnabled) {
    const radius = selectedCell.radius + SELECTED_CELL_RING.padding;
    const strokeColor = calculateSelectionStrokeColor(selectedCell, radius, lighting, opticalDensityLayerEnabled);
    const circumference = Math.PI * 2 * radius;
    const segmentCount = Math.max(
        SELECTED_CELL_RING.minSegments,
        Math.round(circumference / SELECTED_CELL_RING.targetSegmentLength)
    );
    const segmentLength = circumference / segmentCount;
    const dashLength = segmentLength * SELECTED_CELL_RING.dashFraction;
    const gapLength = Math.max(1.0, segmentLength - dashLength);
    const offset = -circumference * (performance.now() * 0.001 * SELECTED_CELL_RING.rotationsPerSecond % 1);

    ctx.save();
    ctx.translate(selectedCell.x, selectedCell.y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = SELECTED_CELL_RING.width;
    ctx.lineCap = "round";
    ctx.setLineDash([dashLength, gapLength]);
    ctx.lineDashOffset = offset;

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

function calculateSelectionStrokeColor(selectedCell, radius, lighting, opticalDensityLayerEnabled) {
    const grayscale = estimateSelectionBackgroundBrightness(selectedCell, radius, lighting, opticalDensityLayerEnabled);

    if (grayscale <= SELECTED_CELL_RING.darkBackgroundThreshold) {
        return selectionStrokeColor(SELECTED_CELL_RING.lightStrokeVar);
    }
    if (grayscale >= SELECTED_CELL_RING.lightBackgroundThreshold) {
        return selectionStrokeColor(SELECTED_CELL_RING.darkStrokeVar);
    }

    return selectionStrokeColor(SELECTED_CELL_RING.midStrokeVar);
}

function selectionStrokeColor(varName) {
    if (!selectionStrokeColorCache.has(varName)) {
        selectionStrokeColorCache.set(varName, cssVar(varName));
    }

    return selectionStrokeColorCache.get(varName);
}

function estimateSelectionBackgroundBrightness(selectedCell, radius, lighting, opticalDensityLayerEnabled) {
    const samples = [
        [selectedCell.x, selectedCell.y - radius],
        [selectedCell.x + radius, selectedCell.y],
        [selectedCell.x, selectedCell.y + radius],
        [selectedCell.x - radius, selectedCell.y],
    ];

    let sum = 0;
    let count = 0;

    for (const [x, y] of samples) {
        sum += estimateBackgroundBrightnessAt(x, y, lighting, opticalDensityLayerEnabled);
        count++;
    }

    return count > 0 ? sum / count : 255;
}

function estimateBackgroundBrightnessAt(x, y, lighting, opticalDensityLayerEnabled) {
    const light = sampleLightingGrid(lighting?.lightMap, lighting, x, y, lighting?.globalLight ?? 0.75);

    if (!opticalDensityLayerEnabled) {
        return backgroundBrightness(light);
    }

    const opacity = sampleLightingGrid(lighting?.opacityMap, lighting, x, y, 0.0);
    const color = opticalDensityColor(light);
    const density = Math.max(0.0, Math.min(1.0, opacity * 8.0));
    const rbScale = 1.0 - density;

    const r = color.r * rbScale;
    const g = color.g * rbScale;
    const b = color.b;

    return r * 0.299 + g * 0.587 + b * 0.114;
}

function sampleLightingGrid(map, lighting, x, y, fallback) {
    if (!Array.isArray(map) || map.length === 0) {
        return fallback;
    }

    const cols = lighting?.gridWidth ?? 0;
    const rows = lighting?.gridHeight ?? 0;
    const gridStep = Math.max(1, lighting?.gridStep ?? 1);

    if (cols <= 0 || rows <= 0) {
        return fallback;
    }

    const col = Math.max(0, Math.min(cols - 1, Math.floor(x / gridStep)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor(y / gridStep)));
    const value = map[row * cols + col];

    return Number.isFinite(value) ? value : fallback;
}

function backgroundBrightness(illumination) {
    const illum = Math.max(0, illumination);

    if (illum <= 1) {
        return Math.round(40 + (200 - 40) * illum);
    }

    const linearSlope = 200 - 40;
    const whiteGap = 255 - 200;
    const k = linearSlope / whiteGap;

    return Math.round(200 + whiteGap * (1 - Math.exp(-k * (illum - 1))));
}

function opticalDensityColor(illumination) {
    const illum = Math.max(0, illumination);

    if (illum <= 1) {
        const t = opticalDensityLowLightTone(illum);
        return mixRgb(OPTICAL_DENSITY_BG_DARK, OPTICAL_DENSITY_BG_MAX, t);
    }

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

function hasOpticalDensityLayer(state) {
    const lighting = state.world?.lighting;

    return Boolean(
        state.displayLayers?.opacityMap
        && Array.isArray(lighting?.opacityMap)
        && lighting.opacityMap.length > 0
    );
}

function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}












