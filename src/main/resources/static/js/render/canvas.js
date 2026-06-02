import { drawDeadCellEffects, updateDeadCellEffects } from "./effects.js";
import { drawBackground, drawDisplayLayers, drawLightSourceBodies } from "./lighting.js";
import { ORGANIC_BROWN_COLOR, organicBrownHsl } from "./colors.js";
import { cssVar } from "../core/utils.js";

const COLD_FILTER_BASE_ALPHA = 0.03;
const COLD_FILTER_MAX_ALPHA  = 0.22;
const HOT_FILTER_BASE_ALPHA  = 0.03;
const HOT_FILTER_MAX_ALPHA   = 0.18;
const COLD_FILTER_COLOR = "59, 130, 246";
const HOT_FILTER_COLOR  = "216, 106, 49";

// Было 0.50. Значение 0.38 визуально усиливает затемнение в темноте примерно на четверть,
// но не проваливает клетки и еду в полностью черный цвет.
const CELL_MIN_LIGHT = 0.38;

// Backend sends the physical optical opacity of the cell. This multiplier maps
// that real opacity to canvas alpha, so cells are genuinely translucent while
// still readable on screen.
const REAL_CELL_OPACITY_TO_RENDER_ALPHA = 9.6;
const MIN_CELL_RENDER_ALPHA = 0.18;
const MAX_CELL_RENDER_ALPHA = 0.82;

const CELL_RADIAL_ALPHA = Object.freeze({
    centerFactor: 0.52,
    midFactor: 0.76,
    edgeFactor: 1.06,
    edgeStop: 0.92,
});

const GFP_FLUORESCENCE_COLOR = Object.freeze({
    hue: 132,
    saturation: 98,
    lightness: 70,
});

const GFP_GLOW = Object.freeze({
    internalCoreAlpha: 1.00,
    internalMidAlpha: 0.72,
    internalEdgeAlpha: 0.20,
    bodyLightnessBoost: 18,
    bodySaturationBoost: 24,
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
const CELL_LIGHTING_DETAIL = Object.freeze({
    gradientScale: 4.85,

    // Highlight stays a crescent, but now it is explicitly bright near the outer
    // cell edge so it does not look detached from the membrane.
    maxHighlightAlpha: 0.68,
    highlightCoreAlpha: 0.44,
    highlightRimAlpha: 0.19,
    highlightInnerCircleShift: 0.50,
    highlightInnerCircleRadius: 1.14,
    highlightCoreX: 0.86,
    highlightCoreY: -0.12,
    highlightGradientOuterRadius: 0.96,
    highlightCoreRadius: 0.38,
    highlightSoftOuterRadiusBoost: 0.38,
    highlightSoftCoreRadiusBoost: 0.30,
    highlightSoftCoreAlphaFactor: 0.18,
    highlightSoftRimAlphaFactor: 0.28,

    // Shadow is not a second crescent anymore. It is a broad side gradient,
    // because real translucent cells usually darken smoothly on the unlit side.
    maxShadowAlpha: 0.70,
    shadowEdgeAlpha: 0.50,
    shadowMidAlpha: 0.34,
    shadowReach: 0.64,
});

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
let cellScratchCanvas = null;
let cellScratchCtx = null;

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
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    clipTube(ctx);

    const opticalDensityLayerEnabled = hasOpticalDensityLayer(state);

    drawBackground(ctx, state.world.lighting, {
        opticalDensityMode: opticalDensityLayerEnabled,
    });

    for (const food of state.world.foods) {
        drawFood(ctx, food, state.world.lighting, opticalDensityLayerEnabled);
    }

    // Light & Density view already visualizes cells through the optical-density map.
    // Do not draw the cell bodies over it, otherwise the actual density layer is harder to read.
    if (!opticalDensityLayerEnabled) {
        for (const cell of state.world.cells) {
            if (cell.dead) continue;
            drawCell(ctx, cell, state.world.lighting, false);
        }
        for (const deadCell of state.world.cells) {
            if (!deadCell.dead) continue;
            drawDeadCell(ctx, deadCell, state.world.lighting, false);
        }
        updateDeadCellEffects();
        drawDeadCellEffects(ctx, false);
    } else {
        updateDeadCellEffects();
    }

    const sliderValue = state.pendingTimeSlider ?? state.config.timeSlider?.value ?? 50;
    applyEnvironmentTint(ctx, sliderValue);

    drawDisplayLayers(ctx, state.world.lighting, state.displayLayers);
    drawCellDirectionLayer(ctx, state);

    ctx.restore();

    drawTubeBorder(ctx);

    if (state.world.lighting) {
        drawLightSourceBodies(ctx, state.world.lighting);
    }

    // Selection ring is an interaction overlay, so it stays visible even when
    // Light & Density view hides the cell bodies.
    drawSelectedCellOverlay(ctx, state, opticalDensityLayerEnabled);
}

function clipTube(ctx) {
    const d = ctx.canvas.width;
    const r = d / 2;

    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.clip();
}

function drawTubeBorder(ctx) {
    const d = ctx.canvas.width;
    const r = d / 2;

    ctx.beginPath();
    ctx.arc(r, r, r - 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(226,232,240,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
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

function drawCell(ctx, cell, lighting, grayscaleMode = false) {
    const illum = cellIlluminance(cell, lighting);
    const gfp = grayscaleMode ? 0.0 : normalizedGfp(cell);
    const l = fluorescentLightnessBoost(modulateLightness(cell.genome.lightness, illum), gfp);
    const saturation = grayscaleMode
        ? 0
        : fluorescentSaturationBoost(cell.genome.saturation, gfp);
    const hue = grayscaleMode ? 0 : cell.genome.colorHue;

    const alpha = cellRenderAlpha(cell);
    if (gfp > 0.001) {
        drawFluorescentCellBody(ctx, cell, hue, saturation, l, alpha, gfp);
    } else {
        fillCellRadialHsl(ctx, cell.x, cell.y, cell.radius, hue, saturation, l, alpha);
    }
    drawCellLightCrescents(ctx, cell);
}

function drawDeadCell(ctx, deadCell, lighting, grayscaleMode = false) {
    const illum = cellIlluminance(deadCell, lighting);
    const l = modulateLightness(ORGANIC_BROWN_COLOR.l, illum);

    if (grayscaleMode) {
        fillCellRadialHsl(ctx, deadCell.x, deadCell.y, deadCell.radius, 0, 0, l, cellRenderAlpha(deadCell));
    } else {
        fillCellRadialHsl(
            ctx,
            deadCell.x,
            deadCell.y,
            deadCell.radius,
            ORGANIC_BROWN_COLOR.h,
            ORGANIC_BROWN_COLOR.s,
            l,
            cellRenderAlpha(deadCell)
        );
    }

    drawCellLightCrescents(ctx, deadCell);
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

function drawCellLightCrescents(ctx, cell) {
    const display = cell.display ?? {};
    const shadowAngleDeg = display.lightDirectionAngle;
    const rawShadowGradient = display.lightGradient;
    const highlightAngleDeg = display.highlightDirectionAngle;
    const rawHighlightStrength = display.highlightStrength;
    const rawHighlightClarity = display.highlightClarity;

    const cellOpacity = cellRenderAlpha(cell);
    const shadowStrength = Number.isFinite(rawShadowGradient)
        ? clamp01(Math.max(0, rawShadowGradient) * CELL_LIGHTING_DETAIL.gradientScale)
        : 0.0;
    const highlightStrength = Number.isFinite(rawHighlightStrength)
        ? clamp01(Math.max(0, rawHighlightStrength))
        : 0.0;
    const highlightClarity = Number.isFinite(rawHighlightClarity)
        ? clamp01(rawHighlightClarity)
        : 0.0;

    const shadowAlpha = CELL_LIGHTING_DETAIL.maxShadowAlpha * shadowStrength * cellOpacity;
    const highlightAlpha = CELL_LIGHTING_DETAIL.maxHighlightAlpha * highlightStrength * cellOpacity;

    if (highlightAlpha <= 0.001 && shadowAlpha <= 0.001) return;

    const radius = cell.radius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cell.x, cell.y);

    if (shadowAlpha > 0.001 && Number.isFinite(shadowAngleDeg)) {
        ctx.save();
        ctx.rotate(shadowAngleDeg * Math.PI / 180.0);
        drawSoftCellSideShadow(ctx, radius, shadowAlpha, shadowStrength * cellOpacity);
        ctx.restore();
    }

    if (highlightAlpha > 0.001 && Number.isFinite(highlightAngleDeg)) {
        ctx.save();
        ctx.rotate(highlightAngleDeg * Math.PI / 180.0);
        drawSoftCellHighlightCrescent(
            ctx,
            radius,
            highlightAlpha,
            highlightStrength * cellOpacity,
            highlightClarity
        );
        ctx.restore();
    }

    ctx.restore();
}

function drawSoftCellHighlightCrescent(ctx, radius, alpha, strength, clarity = 1.0) {
    const crispness = clamp01(clarity);
    const softness = 1.0 - crispness;
    const mainAlpha = clamp01(alpha);
    const coreAlpha = clamp01(
        CELL_LIGHTING_DETAIL.highlightCoreAlpha
        * strength
        * (CELL_LIGHTING_DETAIL.highlightSoftCoreAlphaFactor
            + (1.0 - CELL_LIGHTING_DETAIL.highlightSoftCoreAlphaFactor) * crispness)
    );
    const rimAlpha = clamp01(
        CELL_LIGHTING_DETAIL.highlightRimAlpha
        * strength
        * (CELL_LIGHTING_DETAIL.highlightSoftRimAlphaFactor
            + (1.0 - CELL_LIGHTING_DETAIL.highlightSoftRimAlphaFactor) * crispness)
    );
    if (mainAlpha <= 0.001 && coreAlpha <= 0.001 && rimAlpha <= 0.001) return;

    const outerRadius = CELL_LIGHTING_DETAIL.highlightGradientOuterRadius
        + softness * CELL_LIGHTING_DETAIL.highlightSoftOuterRadiusBoost;
    const coreRadius = CELL_LIGHTING_DETAIL.highlightCoreRadius
        + softness * CELL_LIGHTING_DETAIL.highlightSoftCoreRadiusBoost;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // Main glow is centered close to the outer membrane. Low clarity expands the
    // gradient and suppresses the core/rim, so the highlight becomes softer and
    // fades out instead of snapping to a wrong direction.
    const gradient = ctx.createRadialGradient(
        radius * CELL_LIGHTING_DETAIL.highlightCoreX,
        radius * CELL_LIGHTING_DETAIL.highlightCoreY,
        radius * 0.01,
        radius * 0.70,
        0,
        radius * outerRadius
    );
    gradient.addColorStop(0.00, `rgba(255, 255, 255, ${mainAlpha.toFixed(3)})`);
    gradient.addColorStop(0.28, `rgba(255, 255, 255, ${(mainAlpha * (0.56 + 0.22 * crispness)).toFixed(3)})`);
    gradient.addColorStop(0.66, `rgba(255, 255, 255, ${(mainAlpha * (0.14 + 0.12 * crispness)).toFixed(3)})`);
    gradient.addColorStop(1.00, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = gradient;
    beginRightHighlightCrescentPath(ctx, radius);
    ctx.fill();

    if (rimAlpha > 0.001) {
        const rimGradient = ctx.createLinearGradient(radius * 0.10, 0, radius, 0);
        rimGradient.addColorStop(0.00, "rgba(255, 255, 255, 0)");
        rimGradient.addColorStop(0.70, `rgba(255, 255, 255, ${(rimAlpha * 0.32).toFixed(3)})`);
        rimGradient.addColorStop(1.00, `rgba(255, 255, 255, ${rimAlpha.toFixed(3)})`);

        ctx.fillStyle = rimGradient;
        beginRightHighlightCrescentPath(ctx, radius);
        ctx.fill();
    }

    if (coreAlpha > 0.001) {
        const coreGradient = ctx.createRadialGradient(
            radius * CELL_LIGHTING_DETAIL.highlightCoreX,
            radius * CELL_LIGHTING_DETAIL.highlightCoreY,
            0,
            radius * CELL_LIGHTING_DETAIL.highlightCoreX,
            radius * CELL_LIGHTING_DETAIL.highlightCoreY,
            radius * coreRadius
        );
        coreGradient.addColorStop(0.00, `rgba(255, 255, 255, ${coreAlpha.toFixed(3)})`);
        coreGradient.addColorStop(0.48, `rgba(255, 255, 255, ${(coreAlpha * (0.24 + 0.10 * crispness)).toFixed(3)})`);
        coreGradient.addColorStop(1.00, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = coreGradient;
        beginRightHighlightCrescentPath(ctx, radius);
        ctx.fill();
    }

    ctx.restore();
}

function drawSoftCellSideShadow(ctx, radius, alpha, strength) {
    const edgeAlpha = clamp01(Math.max(
        alpha * CELL_LIGHTING_DETAIL.shadowEdgeAlpha,
        CELL_LIGHTING_DETAIL.shadowEdgeAlpha * strength
    ));
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

function beginRightHighlightCrescentPath(ctx, radius) {
    const innerCenterX = -radius * CELL_LIGHTING_DETAIL.highlightInnerCircleShift;
    const innerRadius = radius * CELL_LIGHTING_DETAIL.highlightInnerCircleRadius;
    const distance = Math.max(1.0e-6, Math.abs(innerCenterX));

    const intersectionX = clamp(
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

function drawCellDirectionLayer(ctx, state) {
    if (!state.displayLayers?.cellDirections) return;

    for (const cell of state.world.cells) {
        if (cell.dead) continue;
        drawDirectionVector(ctx, cell);
    }
}

function drawDirectionVector(ctx, cell) {
    const dirX = cell.motion?.speedDirX ?? 0.0;
    const dirY = cell.motion?.speedDirY ?? 0.0;
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

function cellRenderAlpha(cell) {
    const realOpacity = Math.max(0.0, Number(cell?.opacity ?? 1.0));
    if (realOpacity <= 0.0) {
        return 0.0;
    }
    return clamp(realOpacity * REAL_CELL_OPACITY_TO_RENDER_ALPHA, MIN_CELL_RENDER_ALPHA, MAX_CELL_RENDER_ALPHA);
}

function normalizedGfp(cell) {
    return clamp01((cell?.genome?.gfp ?? 0) / 100.0);
}

function fluorescentLightnessBoost(lightness, gfp) {
    const strength = Math.pow(clamp01(gfp), 0.50);
    return clamp(lightness + GFP_GLOW.bodyLightnessBoost * strength, 0, 96);
}

function fluorescentSaturationBoost(saturation, gfp) {
    return clamp(saturation + GFP_GLOW.bodySaturationBoost * clamp01(gfp), 0, 100);
}

function drawFluorescentCellBody(ctx, cell, hue, saturation, lightness, alpha, gfp) {
    const padding = Math.ceil(Math.max(3, cell.radius * 0.08));
    const size = Math.ceil(cell.radius * 2 + padding * 2);
    const scratch = cellScratch(size);
    if (!scratch?.ctx) {
        fillCellRadialHsl(ctx, cell.x, cell.y, cell.radius, hue, saturation, lightness, alpha);
        return;
    }

    const localCtx = scratch.ctx;
    const center = size * 0.5;
    localCtx.clearRect(0, 0, size, size);

    fillCellRadialHsl(localCtx, center, center, cell.radius, hue, saturation, lightness, alpha);
    drawCellInternalFluorescenceGlow(localCtx, center, center, cell.radius, alpha, gfp);

    ctx.drawImage(cellScratchCanvas, cell.x - center, cell.y - center);
}

function cellScratch(size) {
    if (!Number.isFinite(size) || size <= 0) {
        return null;
    }

    if (!cellScratchCanvas) {
        cellScratchCanvas = document.createElement("canvas");
        cellScratchCtx = cellScratchCanvas.getContext("2d");
    }

    if (!cellScratchCtx) {
        return null;
    }

    if (cellScratchCanvas.width !== size || cellScratchCanvas.height !== size) {
        cellScratchCanvas.width = size;
        cellScratchCanvas.height = size;
    }

    return { ctx: cellScratchCtx };
}

function drawCellInternalFluorescenceGlow(ctx, x, y, radius, baseAlpha, gfp) {
    if (gfp <= 0.001) {
        return;
    }

    // The source-atop blend is applied on a transparent scratch cell layer.
    // It preserves the existing radial alpha mask, so GFP brightens only the
    // visible cell body and never creates an opaque green disk.
    const alpha = clamp01(Math.pow(gfp, 0.46) * (0.92 + 0.08 * baseAlpha));
    const glow = ctx.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        radius
    );
    glow.addColorStop(
        0.00,
        hsla(
            GFP_FLUORESCENCE_COLOR.hue,
            GFP_FLUORESCENCE_COLOR.saturation,
            GFP_FLUORESCENCE_COLOR.lightness,
            GFP_GLOW.internalCoreAlpha * alpha
        )
    );
    glow.addColorStop(
        0.38,
        hsla(
            GFP_FLUORESCENCE_COLOR.hue,
            GFP_FLUORESCENCE_COLOR.saturation,
            GFP_FLUORESCENCE_COLOR.lightness,
            GFP_GLOW.internalMidAlpha * alpha
        )
    );
    glow.addColorStop(
        0.82,
        hsla(
            GFP_FLUORESCENCE_COLOR.hue,
            GFP_FLUORESCENCE_COLOR.saturation,
            GFP_FLUORESCENCE_COLOR.lightness,
            GFP_GLOW.internalEdgeAlpha * alpha
        )
    );
    glow.addColorStop(
        1.00,
        hsla(GFP_FLUORESCENCE_COLOR.hue, GFP_FLUORESCENCE_COLOR.saturation, GFP_FLUORESCENCE_COLOR.lightness, 0)
    );

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function hsla(hue, saturation, lightness, alpha) {
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${clamp01(alpha).toFixed(3)})`;
}

function organicBrownHsla(lightness, alpha) {
    return hsla(ORGANIC_BROWN_COLOR.h, ORGANIC_BROWN_COLOR.s, lightness, alpha);
}

function fillFoodShape(ctx, food, fillStyle, scale = 1.0) {
    const path = foodPath(food.id);

    ctx.save();
    ctx.translate(food.x, food.y);
    ctx.scale(food.radius * scale, food.radius * scale);
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

function seededRandom(seed) {
    let value = (seed >>> 0) || 1;
    return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 0x100000000;
    };
}

function drawSelectedCellOverlay(ctx, state, opticalDensityLayerEnabled) {
    if (!state.selectedCellId) return;

    const selectedCell = state.cellById.get(state.selectedCellId);
    if (!selectedCell || selectedCell.dead) return;

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

function applyEnvironmentTint(ctx, timeSlider) {
    const value = timeSlider ?? 50;
    if (Math.abs(value - 50) < 0.001) return;

    const power = Math.min(1, Math.abs(value - 50) / 50);
    let color, alpha;

    if (value < 50) {
        alpha = COLD_FILTER_BASE_ALPHA + power * (COLD_FILTER_MAX_ALPHA - COLD_FILTER_BASE_ALPHA);
        color = COLD_FILTER_COLOR;
    } else {
        alpha = HOT_FILTER_BASE_ALPHA + power * (HOT_FILTER_MAX_ALPHA - HOT_FILTER_BASE_ALPHA);
        color = HOT_FILTER_COLOR;
    }

    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(${color}, ${alpha.toFixed(3)})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
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

function clamp01(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}
