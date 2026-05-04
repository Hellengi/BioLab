/**
 * preview.js — рендер превью в панели клетки.
 */

import { state } from "../store/SimulationStore.js";
import { drawArrow, preparePreviewCanvas } from "../core/utils.js";
import { dom } from "../ui/dom.js";

export function drawSelectedCellPreview(worldCell, cellTemplate) {
    const prepared = preparePreviewCanvas(dom.selectedCellPreviewCtx, dom.selectedCellPreviewCanvas);
    if (!prepared) return;

    if (!worldCell || !cellTemplate) return;

    const ctx2 = dom.selectedCellPreviewCtx;
    const { width, height } = prepared;
    const centerX = width / 2;
    const centerY = height / 2;
    const previewRadius = 42;

    ctx2.beginPath();
    ctx2.arc(centerX, centerY, previewRadius, 0, Math.PI * 2);
    ctx2.fillStyle = `hsl(${cellTemplate.genome.colorHue}, ${cellTemplate.genome.saturation}%, ${cellTemplate.genome.lightness}%)`;
    ctx2.fill();

    const speed = Math.hypot(worldCell.vx, worldCell.vy);
    if (speed > 0) {
        const dirX = worldCell.vx / speed;
        const dirY = worldCell.vy / speed;
        const arrowLength = Math.min(70, Math.max(18, speed * 14));
        drawArrow(ctx2, centerX, centerY, centerX + dirX * arrowLength, centerY + dirY * arrowLength);
    }
}

export function drawCreateCellPreview() {
    const prepared = preparePreviewCanvas(dom.createCellPreviewCtx, dom.createCellPreviewCanvas);
    if (!prepared || !state.cellDraft) return;

    const ctx2 = dom.createCellPreviewCtx;
    const { width, height } = prepared;
    const centerX = width / 2;
    const centerY = height / 2;
    const previewRadius = 42;

    ctx2.beginPath();
    ctx2.arc(centerX, centerY, previewRadius, 0, Math.PI * 2);
    ctx2.fillStyle = `hsl(${state.cellDraft.genome.colorHue}, ${state.cellDraft.genome.saturation}%, ${state.cellDraft.genome.lightness}%)`;
    ctx2.fill();

    const speed = state.cellDraft.genome.divisionImpulseStrength;
    const arrowLength = Math.min(70, Math.max(18, speed * 14));
    drawArrow(ctx2, centerX, centerY, centerX + arrowLength, centerY);
}