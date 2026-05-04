import {drawDeadCellEffects, updateDeadCellEffects} from "./effects.js";

export function render(ctx, state) {
    if (!state.world || !state.config) {
        return;
    }

    ctx.fillStyle = "#202020";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (const food of state.world.foods) {
        drawFood(ctx, food);
    }

    state.world.cells.forEach(cell => {
        if (cell.dead) {
            drawDeadCell(ctx, cell);
        } else {
            drawCell(ctx, cell);
            drawDirectionVector(ctx, cell, state.config.directionVectorLength);
        }
    });

    if (state.selectedCellId) {
        const selectedCell = state.cellById.get(state.selectedCellId);
        if (selectedCell) {
            drawSelectedCellOutline(ctx, selectedCell);
        }
    }

    updateDeadCellEffects();
    drawDeadCellEffects(ctx);
}

function drawFood(ctx, food) {
    if (food.consumed) {
        return;
    }

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
    ctx.strokeStyle = "#6ee7ff";
    ctx.lineWidth = 2;
    ctx.stroke();
}