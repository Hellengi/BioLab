import { drawDeadCellEffects, updateDeadCellEffects } from "./effects.js";

const COLD_FILTER_BASE_ALPHA  = 0.03;
const COLD_FILTER_MAX_ALPHA = 0.22;

const HOT_FILTER_BASE_ALPHA = 0.03;
const HOT_FILTER_MAX_ALPHA = 0.18;

const COLD_FILTER_COLOR = "59, 130, 246";
const HOT_FILTER_COLOR = "216, 106, 49";

export function render(ctx, state) {
    if (!state.world || !state.config) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = "#A0A0A0";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (const food of state.world.foods) {
        drawFood(ctx, food);
    }

    for (const cell of state.world.cells) {
        drawCell(ctx, cell);
        drawDirectionVector(ctx, cell, state.config.directionVectorLength);
    }

    for (const deadCell of state.world.deadCells) {
        drawDeadCell(ctx, deadCell);
    }

    if (state.selectedCellId) {
        const selectedCell = state.cellById.get(state.selectedCellId);
        if (selectedCell) {
            drawSelectedCellOutline(ctx, selectedCell);
        }
    }

    updateDeadCellEffects();
    drawDeadCellEffects(ctx);

    const sliderValue = state.pendingTimeSlider ?? state.config.timeSlider ?? 50;
    applyEnvironmentTint(ctx, sliderValue);
}

function drawFood(ctx, food) {
    if (food.consumed) return;
    fillCircle(ctx, food.x, food.y, food.radius, "hsl(52, 85%, 60%)");
}

function drawCell(ctx, cell) {
    fillCircle(
        ctx,
        cell.x,
        cell.y,
        cell.radius,
        `hsl(${cell.genome.colorHue}, ${cell.genome.saturation}%, ${cell.genome.lightness}%)`
    );
}

function drawDeadCell(ctx, deadCell) {
    fillCircle(ctx, deadCell.x, deadCell.y, deadCell.radius, "#7a4b2f");
}

function drawDirectionVector(ctx, cell, length) {
    const vectorLength = Math.hypot(cell.vx, cell.vy) || 1;
    const directionX = cell.vx / vectorLength;
    const directionY = cell.vy / vectorLength;

    ctx.beginPath();
    ctx.moveTo(cell.x, cell.y);
    ctx.lineTo(
        cell.x + directionX * length,
        cell.y + directionY * length
    );
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

    if (value === 50) return;

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