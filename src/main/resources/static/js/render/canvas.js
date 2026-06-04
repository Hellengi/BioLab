import { drawDeadCellEffects, updateDeadCellEffects } from "./effects.js";
import { drawBackground, drawDisplayLayers, drawLightSourceBodies } from "./lighting.js";
import { ORGANIC_BROWN_COLOR, organicBrownHsl } from "./colors.js";
import {GFP_GLOW, drawInternalGfpGlow} from "./gfp.js";
import { cssVar } from "../core/utils.js";


const CELL_MIN_LIGHT = 0.38;

const REAL_CELL_OPACITY_TO_RENDER_ALPHA = 9.6;
const MIN_CELL_RENDER_ALPHA = 0.18;
const MAX_CELL_RENDER_ALPHA = 0.82;

const CELL_RADIAL_ALPHA = Object.freeze({
    centerFactor: 0.52,
    midFactor: 0.76,
    edgeFactor: 1.06,
    edgeStop: 0.92,
});

const CYTOSOL_TEXTURE = Object.freeze({
    granules: 10,
    alpha: 0.055,
    minRadius: 0.18,
    maxRadius: 0.52,
});

const GFP_FLUORESCENCE_COLOR = Object.freeze({
    hue: 132,
    saturation: 98,
    lightness: 70,
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
        if (food.capturedByCellId == null) {
            drawFood(ctx, food, state.world.lighting, opticalDensityLayerEnabled);
        }
    }

    // Light & Density view already visualizes cells through the optical-density map.
    // Do not draw the cell bodies over it, otherwise the actual density layer is harder to read.
    if (!opticalDensityLayerEnabled) {
        const capturedFoods = buildCapturedFoodSlotMap(state.world.foods);
        for (const cell of state.world.cells) {
            if (cell.dead) continue;
            drawCell(ctx, cell, state.world.lighting, false, capturedFoods);
        }
        for (const deadCell of state.world.cells) {
            if (!deadCell.dead) continue;
            drawDeadCell(ctx, deadCell, state.world.lighting, false, capturedFoods);
        }
        updateDeadCellEffects();
        drawDeadCellEffects(ctx, false);
    } else {
        updateDeadCellEffects();
    }

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

function drawCell(ctx, cell, lighting, grayscaleMode = false, capturedFoods = null) {
    const illum = cellIlluminance(cell, lighting);
    const visual = cell.visual ?? {};
    const cytosolColor = grayscaleMode ? grayscaleRgb(visual.cytosolColor ?? visual.cellColor) : (visual.cytosolColor ?? visual.cellColor);
    const membraneColor = grayscaleMode ? grayscaleRgb(visual.membraneColor) : visual.membraneColor;
    const chloroplastColor = grayscaleMode ? grayscaleRgb(visual.chloroplastColor) : visual.chloroplastColor;
    const lysosomeColor = grayscaleMode ? grayscaleRgb(visual.lysosomeColor) : visual.lysosomeColor;
    const nucleoidColor = grayscaleMode ? grayscaleRgb(visual.nucleoidColor) : visual.nucleoidColor;

    const bodyOpacity = cytosolRenderAlpha(cell);
    const membraneOpacity = membraneRenderAlpha(cell);

    // Strict visual order: cytosol -> organelles -> membrane -> shading.
    // Low-light color response is restored to the old implementation: biological
    // colors are modulated by illuminance before the cosmetic shadow/highlight pass.
    fillBodySolidRgb(ctx, cell.x, cell.y, cell.radius, cytosolColor, bodyOpacity, illum);
    drawCytosolTexture(ctx, cell, modulateRgb(cytosolColor ?? {r: 200, g: 194, b: 170}, illum), bodyOpacity);
    drawCellInternalGfpGlow(ctx, cell, visual.gfpColor, bodyOpacity);
    drawCellOrganelles(ctx, cell, nucleoidColor, chloroplastColor, lysosomeColor, illum, capturedFoods);
    drawMembraneOverlay(ctx, cell, membraneColor, membraneOpacity, illum);
    drawCellLightCrescents(ctx, cell);
}

function drawCellOrganelles(ctx, cell, nucleoidColor, chloroplastColor, lysosomeColor, illum, capturedFoods = null) {
    drawNucleoid(ctx, cell, nucleoidColor, illum);
    drawLysosomes(ctx, cell, lysosomeColor, illum, capturedFoods);
    drawChloroplasts(ctx, cell, chloroplastColor, illum);
}

function drawNucleoid(ctx, cell, color, illum) {
    const radius = Math.max(1.2, Number(cell.nucleusRadius ?? 0) || cell.radius * 0.28);
    const x = cell.x + (Number(cell.nucleusOffsetX ?? 0) || 0);
    const y = cell.y + (Number(cell.nucleusOffsetY ?? 0) || 0);
    const fill = modulateRgb(color ?? {r: 82, g: 72, b: 150}, illum);
    const alpha = clamp01(Math.max(
        ORGANELLE_VISIBILITY.nucleoidMinAlpha,
        colorOpacity(cell.visual?.nucleoidColor, 0.46) * ORGANELLE_VISIBILITY.nucleoidBoost
    ));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = rgb(fill, 1.0);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    drawOrganelleExternalShadow(ctx, x, y, radius, cell.visual, alpha);
    ctx.restore();
}

function drawChloroplasts(ctx, cell, color, illum) {
    const count = Math.max(0, Math.round(cell.visual?.chloroplastAmount ?? 0));
    const rawOpacity = colorOpacity(cell.visual?.chloroplastColor, 0.0);
    const opacity = rawOpacity <= 0.001 ? 0.0 : clamp01(Math.max(
        ORGANELLE_VISIBILITY.chloroplastMinAlpha,
        rawOpacity * ORGANELLE_VISIBILITY.chloroplastBoost
    ));
    const maxVisible = Math.min(count, 24);
    if (maxVisible <= 0 || opacity <= 0.001) return;

    const fill = modulateRgb(color ?? {r: 170, g: 174, b: 126}, illum);
    const organelleRadius = clamp(cell.radius * 0.11, 1.25, 3.6);
    const seed = Number(cell.id) || 1;

    ctx.save();
    ctx.fillStyle = rgb(fill, opacity);
    ctx.strokeStyle = rgb({r: Math.max(0, fill.r - 34), g: Math.max(0, fill.g - 34), b: Math.max(0, fill.b - 34)}, opacity * 0.55);
    ctx.lineWidth = 0.55;

    for (let i = 0; i < maxVisible; i++) {
        const angle = hash01(seed, i * 2 + 1) * Math.PI * 2;
        const radial01 = Math.sqrt(hash01(seed, i * 2 + 2));
        const distance = radial01 * cell.radius * 0.84;
        const edgeT = smoothstep((radial01 - 0.66) / 0.24);
        const x = cell.x + Math.cos(angle) * distance;
        const y = cell.y + Math.sin(angle) * distance;
        const sx = organelleRadius * 1.34;
        const sy = organelleRadius * (0.78 - edgeT * 0.34);

        ctx.save();
        ctx.translate(x, y);
        const rotation = angle + Math.PI / 2;
        ctx.rotate(rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, sx, sy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}


function drawLysosomes(ctx, cell, color, illum, capturedFoods = null) {
    const count = Math.max(0, Math.round(cell.visual?.lysosomeAmount ?? 0));
    const rawOpacity = colorOpacity(cell.visual?.lysosomeColor, 0.0);
    const opacity = rawOpacity <= 0.001 ? 0.0 : clamp01(Math.max(
        ORGANELLE_VISIBILITY.lysosomeMinAlpha,
        rawOpacity * ORGANELLE_VISIBILITY.lysosomeBoost
    ));
    const maxVisible = Math.min(count, 6);
    if (maxVisible <= 0 || opacity <= 0.001) return;

    const fill = modulateRgb(color ?? {r: 180, g: 36, b: 38}, illum);
    // Lysosomes are drawn as vesicles only. Internal glow was removed because it
    // made the organelle look distorted and did not match the preview.
    const seed = Number(cell.id) || 1;

    const slots = cell.lysosomeSlots ?? [];
    let fallbackLayouts = null;

    ctx.save();
    for (let i = 0; i < maxVisible; i++) {
        const slot = lysosomeSlot(cell, i);
        let layout = lysosomeLayoutFromSlot(slot);
        if (!layout) {
            fallbackLayouts ??= lysosomeLayouts(seed, maxVisible, cell.radius, slots);
            layout = fallbackLayouts[i];
        }
        layout ??= {x: 0, y: 0, r: Math.max(1.2, cell.radius * 0.12), rotation: 0};
        const capturedFood = capturedFoodForSlot(cell, capturedFoods, i);
        const foodRadius = Number(capturedFood?.radius ?? slot?.foodRadius ?? 0) || 0;
        // No internal lysosome glow. Digesting food is visible through the vesicle body.
        const x = cell.x + layout.x;
        const y = cell.y + layout.y;
        const r = layout.r;


        fillLysosomeRadial(ctx, x, y, r, layout.rotation, fill, opacity);
        ctx.strokeStyle = rgb({r: Math.max(0, fill.r - 28), g: Math.max(0, fill.g - 28), b: Math.max(0, fill.b - 28)}, opacity * 0.65);
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.05, r * 0.92, layout.rotation, 0, Math.PI * 2);
        ctx.stroke();

        if (slot?.occupied && foodRadius > 0) {
            const fx = Number(capturedFood?.x ?? x);
            const fy = Number(capturedFood?.y ?? y);
            const fr = Math.max(0.35, foodRadius);
            const baseLightness = 33;
            const shadedLightness = modulateLightness(baseLightness, illum);
            const innerLightness = Math.round(
                baseLightness - (baseLightness - shadedLightness) * FOOD_INNER_BODY.darkeningFactor
            );
            const foodId = Number(slot.foodId ?? capturedFood?.id ?? i);
            const fillStyle = organicBrownHsla(shadedLightness, FOOD_INNER_BODY.mainAlpha);
            const innerStyle = organicBrownHsla(innerLightness, FOOD_INNER_BODY.innerAlpha);
            fillFoodShapeAt(ctx, foodId, fx, fy, fr, fillStyle, 1.0);
            fillFoodShapeAt(ctx, foodId, fx, fy, fr, innerStyle, FOOD_INNER_BODY.scale);
        }

    }
    ctx.restore();
}


function lysosomeLayoutFromSlot(slot) {
    const r = Number(slot?.layoutRadius ?? 0);
    const x = Number(slot?.layoutX ?? NaN);
    const y = Number(slot?.layoutY ?? NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r) || r <= 0) return null;
    return {x, y, r, rotation: Number(slot?.layoutRotation ?? 0) || 0};
}

function lysosomeSlot(cell, index) {
    return (cell.lysosomeSlots ?? []).find(slot => Math.round(Number(slot.index)) === index) ?? null;
}

function buildCapturedFoodSlotMap(foods = []) {
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
    return (capturedFoods ?? []).find(food => Number(food?.capturedByCellId) === cellId && Math.round(Number(food?.digestionSlotIndex)) === index) ?? null;
}

function lysosomeLayouts(seed, count, radius, slots = []) {
    const visibleCount = Math.min(6, Math.max(0, Math.round(count ?? 0)));
    const positions = [];
    const radii = [];
    const nucleusRadius = radius * 0.28;
    const margin = Math.max(0.18, radius * 0.018);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < visibleCount; i++) {
        radii[i] = lysosomeLayoutRadius(radius, slots.find(slot => Math.round(Number(slot.index)) === i));
    }

    for (let i = 0; i < visibleCount; i++) {
        const r = radii[i];
        let minDistance = Math.min(radius * 0.82, nucleusRadius + r + margin);
        const maxDistance = Math.max(0, radius - r - margin);
        if (maxDistance < minDistance) minDistance = maxDistance;

        const baseAngle = hash01(seed + 1709, i * 3 + 1) * Math.PI * 2;
        const radialHash = hash01(seed + 1709, i * 3 + 2);
        const desiredDistance = minDistance + (maxDistance - minDistance) * (0.18 + 0.76 * radialHash);
        let best = {
            x: Math.cos(baseAngle) * desiredDistance,
            y: Math.sin(baseAngle) * desiredDistance,
            score: Number.POSITIVE_INFINITY,
        };

        for (let attempt = 0; attempt < 12; attempt++) {
            const angle = baseAngle + goldenAngle * attempt;
            const distanceT = hash01(seed + 1709, i * 97 + attempt * 7 + 11);
            const distance = attempt === 0 ? desiredDistance : minDistance + (maxDistance - minDistance) * distanceT;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            let score = Math.abs(distance - desiredDistance) * 0.20 + Math.abs(Math.sin((angle - baseAngle) * 0.5)) * radius * 0.04;

            const nucleusGap = Math.hypot(x, y) - nucleusRadius - r - margin;
            if (nucleusGap < 0) score += 10000 + Math.abs(nucleusGap) * 1000;

            const edgeGap = radius - Math.hypot(x, y) - r - margin;
            if (edgeGap < 0) score += 10000 + Math.abs(edgeGap) * 1000;

            for (let j = 0; j < positions.length; j++) {
                const gap = Math.hypot(x - positions[j].x, y - positions[j].y) - r - radii[j] - margin;
                if (gap < 0) score += 10000 + Math.abs(gap) * 1000;
            }

            if (score < best.score) best = {x, y, score};
        }

        positions[i] = {x: best.x, y: best.y, r, rotation: baseAngle * 0.25};
    }

    return positions;
}

function lysosomeLayoutRadius(cellRadius, slot) {
    const base = Math.sqrt(5.2 / Math.PI) * 1.15;
    const foodRadius = Number(slot?.foodRadius ?? slot?.targetFoodRadius ?? 0) || 0;
    const stretched = foodRadius > 0 ? foodRadius * 1.22 : base;
    return Math.max(0.35, Math.max(base, stretched));
}

function drawCellInternalGfpGlow(ctx, cell, color, baseAlpha) {
    drawInternalGfpGlow(ctx, {
        x: cell.x,
        y: cell.y,
        radius: cell.radius,
        color: color ?? {r: 83, g: 255, b: 139},
        expression: cell.visual?.gfpExpression ?? normalizedGfp(cell),
        baseAlpha,
        rgba: rgb,
    });
}

function drawMembraneOverlay(ctx, cell, color, alpha, illum) {
    const baseAlpha = clamp01(alpha);
    if (baseAlpha <= 0.001) return;

    const c = modulateRgb(color ?? {r: 206, g: 197, b: 172}, illum);
    const gradient = ctx.createRadialGradient(cell.x, cell.y, cell.radius * 0.08, cell.x, cell.y, cell.radius);
    gradient.addColorStop(0.0, rgb(c, baseAlpha * 0.18));
    gradient.addColorStop(0.68, rgb(c, baseAlpha * 0.34));
    gradient.addColorStop(0.90, rgb(c, baseAlpha * 0.70));
    gradient.addColorStop(0.98, rgb(c, baseAlpha * 0.96));
    gradient.addColorStop(1.0, rgb(c, baseAlpha));

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}


function drawDeadCell(ctx, deadCell, lighting, grayscaleMode = false, capturedFoods = null) {
    const illum = cellIlluminance(deadCell, lighting);
    drawCell(ctx, deadCell, lighting, grayscaleMode, capturedFoods);

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

function drawCellLightCrescents(ctx, cell) {
    const visual = cell.visual ?? {};
    const shadowAngleDeg = visual.lightDirectionAngle;
    const rawShadowGradient = visual.lightGradient;
    const highlightAngleDeg = visual.highlightDirectionAngle;
    const rawHighlightStrength = visual.highlightStrength;
    const rawHighlightClarity = visual.highlightClarity;

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
    const mainAlpha = clamp01(alpha * (0.82 + 0.18 * crispness));
    const coreAlpha = clamp01(
        CELL_LIGHTING_DETAIL.highlightCoreAlpha
        * strength
        * (0.44 + 0.56 * crispness)
    );
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


function drawCytosolTexture(ctx, cell, color, alpha) {
    const baseAlpha = clamp01(alpha) * CYTOSOL_TEXTURE.alpha;
    if (baseAlpha <= 0.001 || !Number.isFinite(Number(cell?.radius)) || cell.radius <= 0) return;

    const seed = Number(cell.id) || 1;
    const granules = Math.min(CYTOSOL_TEXTURE.granules, Math.max(4, Math.round(cell.radius * 0.30)));
    const c = color ?? {r: 200, g: 194, b: 170};

    ctx.save();
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, cell.radius * 0.96, 0, Math.PI * 2);
    ctx.clip();

    for (let i = 0; i < granules; i++) {
        const angle = hash01(seed + 3907, i * 2 + 1) * Math.PI * 2;
        const radial = Math.sqrt(hash01(seed + 3907, i * 2 + 2)) * cell.radius * 0.82;
        const x = cell.x + Math.cos(angle) * radial;
        const y = cell.y + Math.sin(angle) * radial;
        const r = cell.radius * (CYTOSOL_TEXTURE.minRadius + (CYTOSOL_TEXTURE.maxRadius - CYTOSOL_TEXTURE.minRadius) * hash01(seed + 3907, i * 3 + 5)) * 0.018;
        ctx.fillStyle = rgb({r: Math.min(255, c.r + 18), g: Math.min(255, c.g + 18), b: Math.min(255, c.b + 18)}, baseAlpha * (0.65 + 0.35 * hash01(seed + 3907, i * 5 + 7)));
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.25, r), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function fillLysosomeRadial(ctx, x, y, radius, rotation, color, alpha) {
    const a = clamp01(alpha);
    if (a <= 0.001) return;
    const center = color ?? {r: 180, g: 36, b: 38};
    const midEdge = {r: Math.max(0, center.r - 16), g: Math.max(0, center.g - 16), b: Math.max(0, center.b - 16)};
    const edge = {r: Math.max(0, center.r - 46), g: Math.max(0, center.g - 46), b: Math.max(0, center.b - 46)};

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

function drawOrganelleExternalShadow(ctx, x, y, radius, visual, opacity) {
    const angleDeg = visual?.lightDirectionAngle;
    const rawGradient = visual?.lightGradient;
    const strength = Number.isFinite(rawGradient)
        ? clamp01(Math.max(0, rawGradient) * CELL_LIGHTING_DETAIL.gradientScale)
        : 0.0;
    const alpha = CELL_LIGHTING_DETAIL.maxShadowAlpha * strength * clamp01(opacity);
    if (alpha <= 0.001 || !Number.isFinite(angleDeg)) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(angleDeg * Math.PI / 180.0);
    drawSoftCellSideShadow(ctx, radius, alpha, strength * clamp01(opacity));
    ctx.restore();
}

function fillBodySolidRgb(targetCtx, x, y, radius, color, alpha = 1.0, illum = 1.0) {
    const baseAlpha = clamp01(alpha);
    if (baseAlpha <= 0.0) return;

    const c = modulateRgb(color ?? {r: 200, g: 194, b: 170}, illum);

    targetCtx.save();
    targetCtx.fillStyle = rgb(c, baseAlpha);
    targetCtx.beginPath();
    targetCtx.arc(x, y, radius, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.restore();
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


function drawDeadCellShadingFilter(ctx, cell, illum, grayscaleMode = false) {
    const radius = Number(cell?.radius ?? 0);
    if (!Number.isFinite(radius) || radius <= 0) return;

    const lightness = modulateLightness(ORGANIC_BROWN_COLOR.l, illum);
    const overlayAlpha = clamp01(0.42 + Math.min(0.35, (Number(cell?.lifetimeTicks ?? 0) || 0) / 180));

    ctx.save();
    ctx.globalCompositeOperation = grayscaleMode ? "source-over" : "multiply";
    fillCellRadialHsl(
        ctx,
        0,
        0,
        radius,
        ORGANIC_BROWN_COLOR.h,
        ORGANIC_BROWN_COLOR.s,
        lightness,
        overlayAlpha
    );
    ctx.restore();
}

function oldLowLightDimmingAlpha(illum, opacity) {
    const darkness = 1.0 - clamp01(illum);
    if (darkness <= 0.001) return 0.0;
    return clamp01(darkness * (0.66 + 0.16 * clamp01(opacity)));
}

function drawCellOldLowLightDimming(ctx, radius, alpha) {
    const a = clamp01(alpha);
    if (a <= 0.001) return;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgba(0, 0, 0, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function colorOpacity(color, fallback = 1.0) {
    const value = Number(color?.opacity ?? fallback);
    return clamp01(Number.isFinite(value) ? value : fallback);
}

function cellRenderAlpha(cell) {
    const realOpacity = Math.max(0.0, Number(cell?.visual?.cellColor?.opacity ?? cell?.opacity ?? 1.0));
    if (realOpacity <= 0.0) {
        return 0.0;
    }
    return clamp(realOpacity * REAL_CELL_OPACITY_TO_RENDER_ALPHA, MIN_CELL_RENDER_ALPHA, MAX_CELL_RENDER_ALPHA);
}

function cytosolRenderAlpha(cell) {
    const realOpacity = Math.max(0.0, Number(cell?.visual?.cytosolColor?.opacity ?? cell?.visual?.cellColor?.opacity ?? cell?.opacity ?? 1.0));
    if (realOpacity <= 0.0) {
        return 0.0;
    }
    return clamp(realOpacity * REAL_CELL_OPACITY_TO_RENDER_ALPHA, MIN_CELL_RENDER_ALPHA, MAX_CELL_RENDER_ALPHA);
}

function membraneRenderAlpha(cell) {
    const realOpacity = Math.max(0.0, Number(cell?.visual?.membraneColor?.opacity ?? 0.0));
    if (realOpacity <= 0.0) {
        return 0.0;
    }
    return clamp(realOpacity * REAL_CELL_OPACITY_TO_RENDER_ALPHA, 0.05, 0.88);
}

function fillCellRadialRgb(targetCtx, x, y, radius, color, alpha = 1.0, illum = 1.0) {
    const baseAlpha = clamp01(alpha);
    if (baseAlpha <= 0.0) return;

    const c = modulateRgb(color ?? {r: 200, g: 194, b: 170}, illum);
    const centerAlpha = clamp01(baseAlpha * CELL_RADIAL_ALPHA.centerFactor);
    const midAlpha = clamp01(baseAlpha * CELL_RADIAL_ALPHA.midFactor);
    const edgeAlpha = clamp01(baseAlpha * CELL_RADIAL_ALPHA.edgeFactor);

    const gradient = targetCtx.createRadialGradient(x, y, Math.max(0.0, radius * 0.04), x, y, radius);
    gradient.addColorStop(0.0, rgb(c, centerAlpha));
    gradient.addColorStop(0.55, rgb(c, midAlpha));
    gradient.addColorStop(CELL_RADIAL_ALPHA.edgeStop, rgb(c, edgeAlpha));
    gradient.addColorStop(1.0, rgb(c, edgeAlpha));

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.arc(x, y, radius, 0, Math.PI * 2);
    targetCtx.fillStyle = gradient;
    targetCtx.fill();
    targetCtx.restore();
}

function fillBodyRadialRgb(targetCtx, x, y, radius, color, alpha = 1.0, illum = 1.0) {
    const baseAlpha = clamp01(alpha);
    if (baseAlpha <= 0.0) return;

    const c = modulateRgb(color ?? {r: 200, g: 194, b: 170}, illum);
    const gradient = targetCtx.createRadialGradient(x, y, Math.max(0.0, radius * 0.03), x, y, radius);
    gradient.addColorStop(0.0, rgb(c, baseAlpha));
    gradient.addColorStop(0.58, rgb(c, baseAlpha * 0.88));
    gradient.addColorStop(0.92, rgb(c, baseAlpha * 0.64));
    gradient.addColorStop(1.0, rgb(c, baseAlpha * 0.54));

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.arc(x, y, radius, 0, Math.PI * 2);
    targetCtx.fillStyle = gradient;
    targetCtx.fill();
    targetCtx.restore();
}

function hash01(seed, salt) {
    let x = ((Math.floor(seed) * 374761393) ^ (Math.floor(salt) * 668265263)) >>> 0;
    x = (x ^ (x >>> 13)) >>> 0;
    x = Math.imul(x, 1274126177) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    return x / 0x100000000;
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

function grayscaleRgb(color) {
    if (!color) return color;
    const y = Math.round((color.r ?? 0) * 0.299 + (color.g ?? 0) * 0.587 + (color.b ?? 0) * 0.114);
    return {r: y, g: y, b: y, opacity: color.opacity};
}

function rgb(color, alpha = 1.0) {
    return `rgba(${Math.round(color?.r ?? 255)}, ${Math.round(color?.g ?? 255)}, ${Math.round(color?.b ?? 255)}, ${clamp01(alpha).toFixed(3)})`;
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
        0.42,
        hsla(
            GFP_FLUORESCENCE_COLOR.hue,
            GFP_FLUORESCENCE_COLOR.saturation,
            GFP_FLUORESCENCE_COLOR.lightness,
            GFP_GLOW.internalMidAlpha * alpha
        )
    );
    glow.addColorStop(
        0.92,
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

function smoothstep(value) {
    const t = clamp01(value);
    return t * t * (3.0 - 2.0 * t);
}

function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}




