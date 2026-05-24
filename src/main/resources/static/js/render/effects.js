import {state} from "../store/state.js";

const DEAD_CELL_DISAPPEAR_EFFECT_DURATION_MS = 500;
const DEAD_CELL_DISAPPEAR_EFFECT_MAX_BLUR_PX = 12;
const DEAD_CELL_DISAPPEAR_EFFECT_GROWTH = 1.35;

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

export function drawDeadCellEffects(ctx) {
    const now = performance.now();

    state.deadCellDisappearEffects = state.deadCellDisappearEffects.filter(effect => {
        const progress = (now - effect.startTime) / DEAD_CELL_DISAPPEAR_EFFECT_DURATION_MS;
        if (progress >= 1) return false;

        const blurPx = progress * DEAD_CELL_DISAPPEAR_EFFECT_MAX_BLUR_PX;
        const alpha = 1 - progress;
        const radius = effect.radius * (1 + progress * (DEAD_CELL_DISAPPEAR_EFFECT_GROWTH - 1));

        ctx.save();
        ctx.filter = `blur(${blurPx}px)`;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#7a4b2f";
        ctx.fill();
        ctx.restore();

        return true;
    });
}

function startDeadCellEffect(deadCell) {
    state.deadCellDisappearEffects.push({
        x: deadCell.x,
        y: deadCell.y,
        radius: deadCell.radius,
        startTime: performance.now(),
    });
}
