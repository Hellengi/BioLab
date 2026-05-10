import { state } from "../store/store.js";
import { preparePreviewCanvas } from "../core/utils.js";
import { dom } from "../ui/dom.js";
import {
    getCollisionImpulseHistory,
} from "../ui/panels/selectionPanel.js";

const PREVIEW_RADIUS = 42;
const COLLISION_FADE_SECONDS = 1.0;
const FORCE_ARROW_SCALE = 6.0;
const DRAG_ARROW_SCALE = 6.0;
const VELOCITY_ARROW_SCALE = 24.0;
const IMPULSE_ARROW_SCALE = 0.25;
const MAX_ARROW = PREVIEW_RADIUS - 6;

function _cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function _arrowColors() {
    return {
        gravity: _cssVar('--c-arrow-gravity'),
        buoyancy: _cssVar('--c-arrow-buoyancy'),
        drag: _cssVar('--c-arrow-drag'),
        impulse: _cssVar('--c-arrow-impulse'),
        speed: _cssVar('--c-arrow-speed'),
    };
}

let _forceViewEnabled = false;

export function isForceViewEnabled() {
    return _forceViewEnabled;
}

export function setForceViewEnabled(enabled) {
    _forceViewEnabled = enabled;
    _updatePreviewLayout(enabled);
}

function _updatePreviewLayout(forceMode) {
    const stickyPreview = dom.selectedCellPreviewCanvas?.closest('.sticky-preview');
    const previewWrap = dom.selectedCellPreviewCanvas?.closest('.selected-cell-preview-wrap');
    if (!stickyPreview || !previewWrap) return;

    if (forceMode) {
        stickyPreview.classList.add('sticky-preview--force-mode');
        if (!previewWrap.querySelector('.force-legend')) {
            previewWrap.appendChild(_buildLegend());
        }
    } else {
        stickyPreview.classList.remove('sticky-preview--force-mode');
        previewWrap.querySelector('.force-legend')?.remove();
    }
}

let _legendGravRow = null;

function _buildLegend() {
    const colors = _arrowColors();
    const legend = document.createElement('div');
    legend.className = 'force-legend';

    const items = [
        { color: colors.gravity, label: 'Gravity/buoyancy', dash: false, thick: true, isGravBuoy: true },
        { color: colors.drag, label: 'Drag force', dash: false, thick: true },
        { color: colors.speed, label: 'Speed', dash: true,  thick: false },
        { color: colors.impulse, label: 'Impulse', dash: false, thick: false },
    ];

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'force-legend-row';
        if (item.isGravBuoy) _legendGravRow = row;

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 28 10');
        svg.setAttribute('width', '28');
        svg.setAttribute('height', '10');
        svg.style.flexShrink = '0';

        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', '2');
        line.setAttribute('y1', '5');
        line.setAttribute('x2', '22');
        line.setAttribute('y2', '5');
        line.setAttribute('stroke', item.color);
        line.setAttribute('stroke-width', item.thick ? '2.5' : '1.5');
        if (item.dash) line.setAttribute('stroke-dasharray', '4 2');
        svg.appendChild(line);

        const arrow = document.createElementNS(svgNS, 'polyline');
        arrow.setAttribute('points', '17,2 22,5 17,8');
        arrow.setAttribute('stroke', item.color);
        arrow.setAttribute('stroke-width', item.thick ? '2' : '1.5');
        arrow.setAttribute('fill', 'none');
        svg.appendChild(arrow);

        const label = document.createElement('span');
        label.textContent = item.label;
        label.className = 'force-legend-label';

        row.appendChild(svg);
        row.appendChild(label);
        legend.appendChild(row);
    });

    return legend;
}

export function drawSelectedCellPreview(worldCell, cellTemplate) {
    const prepared = preparePreviewCanvas(dom.selectedCellPreviewCtx, dom.selectedCellPreviewCanvas);
    if (!prepared) return;

    if (!worldCell || !cellTemplate) return;

    const ctx2 = dom.selectedCellPreviewCtx;
    const { width, height } = prepared;
    const cx = width / 2;
    const cy = height / 2;

    if (_forceViewEnabled) {
        _drawForceMode(ctx2, worldCell, cellTemplate, cx, cy, width, height);
    } else {
        _drawNormalMode(ctx2, worldCell, cellTemplate, cx, cy);
    }
}

function _updateLegendGravRow(isSinking) {
    if (!_legendGravRow) return;
    const colors = _arrowColors();
    const color = isSinking ? colors.gravity : colors.buoyancy;
    const label = isSinking ? 'Gravity force' : 'Buoyancy force';

    const line = _legendGravRow.querySelector('line');
    const arrowEl = _legendGravRow.querySelector('polyline');
    const labelEl = _legendGravRow.querySelector('.force-legend-label');

    if (line)    { line.setAttribute('stroke', color); }
    if (arrowEl) { arrowEl.setAttribute('stroke', color); }
    if (labelEl) { labelEl.textContent = label; }
}

function _drawNormalMode(ctx, worldCell, cellTemplate, cx, cy) {
    ctx.beginPath();
    ctx.arc(cx, cy, PREVIEW_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${cellTemplate.genome.colorHue}, ${cellTemplate.genome.saturation}%, ${cellTemplate.genome.lightness}%)`;
    ctx.fill();
}

function _drawForceMode(ctx, worldCell, cellTemplate, cx, cy, width, height) {
    ctx.beginPath();
    ctx.arc(cx, cy, PREVIEW_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#555a6a';
    ctx.fill();
    ctx.strokeStyle = '#7a8290';
    ctx.lineWidth = 1;
    ctx.stroke();

    const motion = worldCell.motion ?? {};
    const speed = motion.speed ?? 0;
    const gravBuoyForce = motion.gravityBuoyancyForce ?? 0;
    const dragForce = motion.dragForce ?? 0;

    const colors = _arrowColors();
    const isSinking = gravBuoyForce >= 0;
    const gravColor = isSinking ? colors.gravity : colors.buoyancy;

    _updateLegendGravRow(isSinking);

    const gravDir = {
        x: motion.gravityBuoyancyDirX ?? 0,
        y: motion.gravityBuoyancyDirY ?? Math.sign(gravBuoyForce)
    };
    const gravMag = Math.min(MAX_ARROW, Math.sqrt(Math.abs(gravBuoyForce)) * FORCE_ARROW_SCALE);
    if (gravMag > 1) {
        _drawStyledArrow(ctx, cx, cy,
            cx + gravDir.x * gravMag,
            cy + gravDir.y * gravMag,
            gravColor, 2.5);
    }

    if (speed > 0.001 && dragForce > 0.0001) {
        const dragDir = {
            x: motion.dragDirX ?? 0,
            y: motion.dragDirY ?? 0
        };
        const dragMag = Math.min(MAX_ARROW, Math.sqrt(dragForce) * DRAG_ARROW_SCALE);
        if (dragMag > 1) {
            _drawStyledArrow(ctx, cx, cy,
                cx + dragDir.x * dragMag,
                cy + dragDir.y * dragMag,
                colors.drag, 2.5);
        }
    }

    if (speed > 0.001) {
        const velDir = {
            x: motion.velocityDirX ?? 0,
            y: motion.velocityDirY ?? 0
        };
        const velMag = Math.min(MAX_ARROW, speed * VELOCITY_ARROW_SCALE);
        if (velMag > 1) {
            _drawDashedArrow(ctx, cx, cy,
                cx + velDir.x * velMag,
                cy + velDir.y * velMag,
                colors.speed, 1.5);
        }
    }

    for (const impulse of getCollisionImpulseHistory()) {
        const alpha = Math.max(
            0.0,
            Math.min(1.0, 1.0 - impulse.ageSeconds / COLLISION_FADE_SECONDS)
        );
        const dirLen = Math.sqrt(impulse.dirX * impulse.dirX + impulse.dirY * impulse.dirY);

        if (alpha > 0.0 && dirLen > 0.000001) {
            const dirX = impulse.dirX / dirLen;
            const dirY = impulse.dirY / dirLen;
            const impMag = Math.min(MAX_ARROW, Math.abs(impulse.impulse) * IMPULSE_ARROW_SCALE);

            if (impMag > 1) {
                const contactX = cx - dirX * PREVIEW_RADIUS;
                const contactY = cy - dirY * PREVIEW_RADIUS;

                const sourceX = contactX - dirX * impMag;
                const sourceY = contactY - dirY * impMag;

                ctx.save();
                ctx.globalAlpha = alpha;
                _drawStyledArrow(
                    ctx,
                    sourceX,
                    sourceY,
                    contactX,
                    contactY,
                    colors.impulse,
                    2
                );
                ctx.restore();
            }
        }
    }
}

function _drawStyledArrow(ctx, x1, y1, x2, y2, color, lineWidth) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headSize = 6;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
        x2 - Math.cos(angle - Math.PI / 6) * headSize,
        y2 - Math.sin(angle - Math.PI / 6) * headSize
    );
    ctx.moveTo(x2, y2);
    ctx.lineTo(
        x2 - Math.cos(angle + Math.PI / 6) * headSize,
        y2 - Math.sin(angle + Math.PI / 6) * headSize
    );
    ctx.stroke();
    ctx.restore();
}

function _drawDashedArrow(ctx, x1, y1, x2, y2, color, lineWidth) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headSize = 5;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
        x2 - Math.cos(angle - Math.PI / 6) * headSize,
        y2 - Math.sin(angle - Math.PI / 6) * headSize
    );
    ctx.moveTo(x2, y2);
    ctx.lineTo(
        x2 - Math.cos(angle + Math.PI / 6) * headSize,
        y2 - Math.sin(angle + Math.PI / 6) * headSize
    );
    ctx.stroke();
    ctx.restore();
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

    const divisionAngleDeg = state.cellDraft.genome.divisionAngle ?? 0;
    const axisRad = (divisionAngleDeg - 90) * Math.PI / 180;
    const axisLen = previewRadius + 6;
    ctx2.save();
    ctx2.setLineDash([4, 4]);
    ctx2.strokeStyle = "rgba(255,255,255,0.55)";
    ctx2.lineWidth = 1.5;
    ctx2.beginPath();
    ctx2.moveTo(centerX + Math.cos(axisRad) * axisLen, centerY + Math.sin(axisRad) * axisLen);
    ctx2.lineTo(centerX - Math.cos(axisRad) * axisLen, centerY - Math.sin(axisRad) * axisLen);
    ctx2.stroke();
    ctx2.setLineDash([]);
    ctx2.restore();

    const speed = state.cellDraft.initialSpeed ?? 0;
    const arrowRad = ((state.cellDraft.initialDirection ?? 0) - 90) * Math.PI / 180;
    if (speed > 0.001) {
        const arrowLength = Math.min(MAX_ARROW, speed * VELOCITY_ARROW_SCALE);

        if (arrowLength > 1) {
            _drawDashedArrow(
                ctx2,
                centerX,
                centerY,
                centerX + Math.cos(arrowRad) * arrowLength,
                centerY + Math.sin(arrowRad) * arrowLength,
                _arrowColors().speed,
                1.5
            );
        }
    }
}