import { drawDeadCellEffects, updateDeadCellEffects } from "./effects.js";
import { drawBackground, drawLightSourceBodies } from "./lighting.js";

const COLD_FILTER_BASE_ALPHA = 0.03;
const COLD_FILTER_MAX_ALPHA  = 0.22;
const HOT_FILTER_BASE_ALPHA  = 0.03;
const HOT_FILTER_MAX_ALPHA   = 0.18;
const COLD_FILTER_COLOR = "59, 130, 246";
const HOT_FILTER_COLOR  = "216, 106, 49";
const CELL_MIN_LIGHT = 0.5;
const DIRECTION_VECTOR_LENGTH = 12.0;

export function render(ctx, state) {
    if (!state.world || !state.config) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    clipTube(ctx);
    drawBackground(ctx, state.world.lighting);
    for (const food of state.world.foods) {
        drawFood(ctx, food);
    }
    for (const cell of state.world.cells.filter(cell => !cell.dead)) {
        drawCell(ctx, cell, state.world.lighting);
        drawDirectionVector(ctx, cell, DIRECTION_VECTOR_LENGTH);
    }
    for (const deadCell of state.world.cells.filter(cell => cell.dead)) {
        drawDeadCell(ctx, deadCell, state.world.lighting);
    }
    if (state.selectedCellId) {
        const selectedCell = state.cellById.get(state.selectedCellId);
        if (selectedCell) {
            drawSelectedCellOutline(ctx, selectedCell);
        }
    }
    updateDeadCellEffects();
    drawDeadCellEffects(ctx);

    const sliderValue = state.pendingTimeSlider ?? state.config.timeSlider?.value ?? 50;
    applyEnvironmentTint(ctx, sliderValue);
    ctx.restore();

    drawTubeBorder(ctx);

    if (state.world.lighting) {
        drawLightSourceBodies(ctx, state.world.lighting);
    }
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

function drawFood(ctx, food) {
    if (food.consumed) return;
    fillCircle(ctx, food.x, food.y, food.radius, "hsl(52, 85%, 60%)");
}

function drawCell(ctx, cell, lighting) {
    const illum = cellIlluminance(cell, lighting);
    const l = modulateLightness(cell.genome.lightness, illum);
    fillCircle(
        ctx,
        cell.x,
        cell.y,
        cell.radius,
        `hsl(${cell.genome.colorHue}, ${cell.genome.saturation}%, ${l}%)`
    );
}

function drawDeadCell(ctx, deadCell, lighting) {
    const illum = cellIlluminance(deadCell, lighting);
    const l = modulateLightness(33, illum);
    fillCircle(ctx, deadCell.x, deadCell.y, deadCell.radius,
        `hsl(22, 43%, ${l}%)`);
}

function cellIlluminance(cell, lighting) {
    const rawLight = typeof cell.localLight === 'number'
        ? cell.localLight
        : lighting?.globalLight ?? 0.75;

    const clampedLight = Math.max(0, Math.min(1, rawLight));
    return CELL_MIN_LIGHT + clampedLight * (1 - CELL_MIN_LIGHT);
}

function modulateLightness(genomeLightness, illuminance) {
    const minL = 5;
    return Math.round(minL + (genomeLightness - minL) * illuminance);
}

function drawDirectionVector(ctx, cell, length) {
    const dirX = cell.motion?.speedDirX ?? 0.0;
    const dirY = cell.motion?.speedDirY ?? 0.0;
    if (dirX === 0.0 && dirY === 0.0) return;

    ctx.beginPath();
    ctx.moveTo(cell.x, cell.y);
    ctx.lineTo(cell.x + dirX * length, cell.y + dirY * length);
    ctx.strokeStyle = "#ff8c42";
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function fillCircle(targetCtx, x, y, radius, fillStyle) {
    targetCtx.beginPath();
    targetCtx.arc(x, y, radius, 0, Math.PI * 2);
    targetCtx.fillStyle = fillStyle;
    targetCtx.fill();
}

function drawSelectedCellOutline(ctx, selectedCell) {
    ctx.beginPath();
    ctx.arc(selectedCell.x, selectedCell.y, selectedCell.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "#2563EB";
    ctx.lineWidth = 2;
    ctx.stroke();
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