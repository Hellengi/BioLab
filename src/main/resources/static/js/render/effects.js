import {state} from "../store/state.js";
import { ORGANIC_BROWN_COLOR } from "./colors.js";

const DEAD_CELL_DISAPPEAR_EFFECT_DURATION_MS = 500;
const DEAD_CELL_DISAPPEAR_EFFECT_MAX_BLUR_PX = 12;
const DEAD_CELL_DISAPPEAR_EFFECT_GROWTH = 1.35;
const CELL_MIN_LIGHT = 0.38;
const REAL_CELL_OPACITY_TO_RENDER_ALPHA = 9.6;
const MIN_CELL_RENDER_ALPHA = 0.18;
const MAX_CELL_RENDER_ALPHA = 0.82;

export function updateDeadCellEffects() {
    const currentDeadCellsById = new Map();
    for (const deadCell of (state.world?.cells ?? []).filter(cell => cell.dead) ?? []) {
        currentDeadCellsById.set(deadCell.id, deadCell);
    }

    for (const [deadCellId, previousDeadCell] of state.prevDeadCellsById.entries()) {
        if (!currentDeadCellsById.has(deadCellId)) {
            startDeadCellEffect(previousDeadCell);
        }
    }

    state.prevDeadCellsById = currentDeadCellsById;
}

export function drawDeadCellEffects(ctx, grayscaleMode = false) {
    const now = performance.now();

    state.deadCellDisappearEffects = state.deadCellDisappearEffects.filter(effect => {
        const progress = (now - effect.startTime) / DEAD_CELL_DISAPPEAR_EFFECT_DURATION_MS;
        if (progress >= 1) return false;

        const blurPx = progress * DEAD_CELL_DISAPPEAR_EFFECT_MAX_BLUR_PX;
        const alpha = (1 - progress) * effect.alpha;
        const radius = effect.radius * (1 + progress * (DEAD_CELL_DISAPPEAR_EFFECT_GROWTH - 1));
        const fillStyle = grayscaleMode ? effect.grayscaleFillStyle : effect.fillStyle;

        ctx.save();
        ctx.filter = `blur(${blurPx}px)`;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.restore();

        return true;
    });
}

function startDeadCellEffect(deadCell) {
    const lightness = displayedDeadCellLightness(deadCell);

    state.deadCellDisappearEffects.push({
        x: deadCell.x,
        y: deadCell.y,
        radius: deadCell.radius,
        alpha: cellRenderAlpha(deadCell),
        fillStyle: hsl(ORGANIC_BROWN_COLOR.h, ORGANIC_BROWN_COLOR.s, lightness),
        grayscaleFillStyle: hsl(0, 0, lightness),
        startTime: performance.now(),
    });
}

function displayedDeadCellLightness(deadCell) {
    const illuminance = lightMultiplier(Number.isFinite(deadCell.localLight) ? deadCell.localLight : 0.75);
    return modulateLightness(ORGANIC_BROWN_COLOR.l, illuminance);
}

function lightMultiplier(rawLight) {
    const clampedLight = Math.max(0, Math.min(1, rawLight));
    return CELL_MIN_LIGHT + clampedLight * (1 - CELL_MIN_LIGHT);
}

function modulateLightness(baseLightness, illuminance) {
    const minL = 5;
    return Math.round(minL + (baseLightness - minL) * illuminance);
}

function cellRenderAlpha(cell) {
    const realOpacity = Math.max(0.0, Number(cell?.opacity ?? 1.0));
    if (realOpacity <= 0.0) {
        return 0.0;
    }
    return Math.max(
        MIN_CELL_RENDER_ALPHA,
        Math.min(MAX_CELL_RENDER_ALPHA, realOpacity * REAL_CELL_OPACITY_TO_RENDER_ALPHA)
    );
}

function hsl(hue, saturation, lightness) {
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
