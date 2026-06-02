import {cssVar, preparePreviewCanvas} from "../core/utils.js";
import { dom } from "../ui/dom.js";
import {state} from "../store/state.js";

const PREVIEW_RADIUS = 42;
const REAL_CELL_OPACITY_TO_PREVIEW_ALPHA = 3.6;
const MIN_CELL_PREVIEW_ALPHA = 0.18;
const MAX_CELL_PREVIEW_ALPHA = 0.82;
const PREVIEW_REAL_CELL_OPACITY = 0.1;
const PREVIEW_CELL_RADIAL_ALPHA = Object.freeze({
    centerFactor: 0.52,
    midFactor: 0.76,
    edgeFactor: 1.06,
    edgeStop: 0.92,
});
const PREVIEW_GFP_FLUORESCENCE_COLOR = Object.freeze({
    hue: 132,
    saturation: 98,
    lightness: 70,
});

const PREVIEW_GFP_GLOW = Object.freeze({
    radiusBase: 1.55,
    radiusBoost: 1.05,
    externalCoreAlpha: 0.32,
    externalOuterAlpha: 0.13,
    internalCoreAlpha: 1.00,
    internalMidAlpha: 0.72,
    internalEdgeAlpha: 0.20,
    bodyLightnessBoost: 18,
    bodySaturationBoost: 24,
});
const IMPULSE_ARROW_SCALE = 0.25;
const FORCE_ARROW_SCALE = 6.0;
const DRAG_ARROW_SCALE = 6.0;
const VELOCITY_ARROW_SCALE = 36.0;
const MIN_SPEED_ARROW = 4;
const MAX_ARROW = 60;

function _arrowColors() {
    return {
        gravity: cssVar('--c-arrow-gravity'),
        buoyancy: cssVar('--c-arrow-buoyancy'),
        drag: cssVar('--c-arrow-drag'),
        impulse: cssVar('--c-arrow-impulse'),
        speed: cssVar('--c-arrow-speed'),
    };
}

let _forceViewEnabled = false;


export function setForceViewEnabled(enabled) {
    _forceViewEnabled = enabled;
    _updatePreviewLayout(enabled);
}

function _updatePreviewLayout(forceMode) {
    const legend = dom.forceLegend;
    if (!legend) return;

    if (forceMode) {
        if (legend.children.length === 0) {
            _fillLegend(legend);
        }
        legend.classList.remove('force-legend--hidden');
    } else {
        legend.classList.add('force-legend--hidden');
    }
}

let _legendGravRow = null;

function _fillLegend(legend) {
    legend.innerHTML = '';
    _legendGravRow = null;

    const colors = _arrowColors();
    const items = [
        { color: colors.gravity, label: 'Gravity/buoyancy', dash: false, thick: true, isGravBuoy: true },
        { color: colors.drag,    label: 'Drag force',       dash: false, thick: true  },
        { color: colors.speed,   label: 'Speed',            dash: true,  thick: false },
        { color: colors.impulse, label: 'Impulse',          dash: false, thick: false },
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
        line.setAttribute('x1', '2');  line.setAttribute('y1', '5');
        line.setAttribute('x2', '22'); line.setAttribute('y2', '5');
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
}

export function drawSelectedCellPreview(worldCell, strain) {
    const prepared = preparePreviewCanvas(dom.selectedCellPreviewCtx, dom.selectedCellPreviewCanvas);
    if (!prepared) return;

    if (!worldCell || !strain) return;

    const ctx2 = dom.selectedCellPreviewCtx;
    const { width, height } = prepared;
    const cx = width / 2;
    const cy = height / 2;

    if (_forceViewEnabled) {
        _drawForceMode(ctx2, worldCell, strain, cx, cy, width, height);
    } else {
        _drawNormalMode(ctx2, worldCell, strain, cx, cy);
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

function _drawNormalMode(ctx, worldCell, strain, cx, cy) {
    const alpha = _previewAlpha(worldCell?.opacity);
    const gfp = _normalizedGfp(strain.genome?.gfp);
    const lightness = _fluorescentLightnessBoost(strain.genome.lightness, gfp);
    const saturation = _fluorescentSaturationBoost(strain.genome.saturation, gfp);

    _drawPreviewExternalGfpGlow(ctx, cx, cy, PREVIEW_RADIUS, strain.genome?.gfp, alpha);
    _fillPreviewCellRadialHsl(
        ctx,
        cx,
        cy,
        PREVIEW_RADIUS,
        strain.genome.colorHue,
        saturation,
        lightness,
        alpha
    );
    _drawPreviewInternalGfpGlow(ctx, cx, cy, PREVIEW_RADIUS, strain.genome?.gfp, alpha);
}

function _directionFromDto(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x === 0 && y === 0) return null;
    return { x, y };
}

const EVENT_TYPE_IMPULSE = "impulse";

function _getImpulseEvents(worldCell) {
    return (worldCell.events ?? []).filter(event => event.type === EVENT_TYPE_IMPULSE);
}

function _eventAlpha(event) {
    const currentTime = state.world?.time;

    if (!Number.isFinite(currentTime) || !Number.isFinite(event.time)) {
        return 1.0;
    }

    const duration = Number.isFinite(event.duration) && event.duration > 0
        ? event.duration
        : 1.0;

    const age = Math.max(0.0, currentTime - event.time);
    return Math.max(0.0, Math.min(1.0, 1.0 - age / duration));
}

function _drawForceMode(ctx, worldCell, strain, cx, cy, width, height) {
    ctx.beginPath();
    ctx.arc(cx, cy, PREVIEW_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#555a6a';
    ctx.fill();
    ctx.strokeStyle = '#7a8290';
    ctx.lineWidth = 1;
    ctx.stroke();

    const motion = worldCell.motion ?? {};
    const speed = motion.speed ?? 0;
    const gravBuoyForce = motion.gravForce ?? 0;
    const dragForce = motion.dragForce ?? 0;

    const colors = _arrowColors();
    const speedDirection = _directionFromDto(motion.speedDirX, motion.speedDirY);
    const dragDirection = _directionFromDto(motion.dragDirX, motion.dragDirY);
    const gravityDirection = _directionFromDto(motion.gravDirX, motion.gravDirY);
    const isSinking = gravBuoyForce >= 0;
    const gravColor = isSinking ? colors.gravity : colors.buoyancy;

    _updateLegendGravRow(isSinking);

    for (const impulse of _getImpulseEvents(worldCell)) {
        const alpha = _eventAlpha(impulse);

        const hasDirection =
            Number.isFinite(impulse.normalX) &&
            Number.isFinite(impulse.normalY) &&
            (impulse.normalX !== 0 || impulse.normalY !== 0);

        if (alpha > 0.0 && hasDirection) {
            const dirX = impulse.normalX;
            const dirY = impulse.normalY;
            const impMag = Math.min(MAX_ARROW, Math.abs(impulse.impulse ?? 0) * IMPULSE_ARROW_SCALE);

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

    if (Math.abs(gravBuoyForce) > 0.05 && gravityDirection) {
        const gravMag = Math.min(
            MAX_ARROW,
            Math.sqrt(Math.abs(gravBuoyForce)) * FORCE_ARROW_SCALE
        );

        if (gravMag > 1) {
            _drawStyledArrow(ctx, cx, cy,
                cx + gravityDirection.x * gravMag,
                cy + gravityDirection.y * gravMag,
                gravColor, 2.5);
        }
    }

    if (Math.abs(dragForce) > 0.05 && dragDirection) {
        const dragMag = Math.min(
            MAX_ARROW,
            Math.log1p(Math.abs(dragForce)) * DRAG_ARROW_SCALE
        );

        if (dragMag > 1) {
            _drawStyledArrow(ctx, cx, cy,
                cx + dragDirection.x * dragMag,
                cy + dragDirection.y * dragMag,
                colors.drag, 2.5);
        }
    }

    if (speed > 0.001 && speedDirection) {
        const velMag = Math.min(
            MAX_ARROW,
            Math.max(MIN_SPEED_ARROW, Math.sqrt(speed) * VELOCITY_ARROW_SCALE)
        );

        _drawDashedArrow(ctx, cx, cy,
            cx + speedDirection.x * velMag,
            cy + speedDirection.y * velMag,
            colors.speed, 1.5);
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

function _previewAlpha(realOpacity = PREVIEW_REAL_CELL_OPACITY) {
    const opacity = Math.max(0.0, Number(realOpacity ?? PREVIEW_REAL_CELL_OPACITY));
    if (opacity <= 0.0) {
        return 0.0;
    }
    return Math.max(
        MIN_CELL_PREVIEW_ALPHA,
        Math.min(MAX_CELL_PREVIEW_ALPHA, opacity * REAL_CELL_OPACITY_TO_PREVIEW_ALPHA)
    );
}

function _clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

function _clamp01(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

function _fillPreviewCellRadialHsl(ctx, cx, cy, radius, hue, saturation, lightness, alpha) {
    const baseAlpha = _clamp01(alpha);
    if (baseAlpha <= 0.0) return;

    const centerAlpha = _clamp01(baseAlpha * PREVIEW_CELL_RADIAL_ALPHA.centerFactor);
    const midAlpha = _clamp01(baseAlpha * PREVIEW_CELL_RADIAL_ALPHA.midFactor);
    const edgeAlpha = _clamp01(baseAlpha * PREVIEW_CELL_RADIAL_ALPHA.edgeFactor);

    const gradient = ctx.createRadialGradient(
        cx,
        cy,
        Math.max(0.0, radius * 0.04),
        cx,
        cy,
        radius
    );
    gradient.addColorStop(0.0, _hsla(hue, saturation, lightness, centerAlpha));
    gradient.addColorStop(0.55, _hsla(hue, saturation, lightness, midAlpha));
    gradient.addColorStop(PREVIEW_CELL_RADIAL_ALPHA.edgeStop, _hsla(hue, saturation, lightness, edgeAlpha));
    gradient.addColorStop(1.0, _hsla(hue, saturation, lightness, edgeAlpha));

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
}

function _drawPreviewExternalGfpGlow(ctx, cx, cy, radius, gfpValue, baseAlpha) {
    const gfp = _normalizedGfp(gfpValue);
    if (gfp <= 0.001) {
        return;
    }

    const glowRadius = radius * (PREVIEW_GFP_GLOW.radiusBase + PREVIEW_GFP_GLOW.radiusBoost * gfp);
    const glow = ctx.createRadialGradient(
        cx,
        cy,
        Math.max(1.0, radius * 0.35),
        cx,
        cy,
        glowRadius
    );
    const alpha = _clamp01(Math.pow(gfp, 0.62) * Math.max(baseAlpha, 0.62));

    glow.addColorStop(
        0.0,
        _hsla(PREVIEW_GFP_FLUORESCENCE_COLOR.hue, PREVIEW_GFP_FLUORESCENCE_COLOR.saturation, PREVIEW_GFP_FLUORESCENCE_COLOR.lightness, PREVIEW_GFP_GLOW.externalCoreAlpha * alpha)
    );
    glow.addColorStop(
        0.45,
        _hsla(PREVIEW_GFP_FLUORESCENCE_COLOR.hue, PREVIEW_GFP_FLUORESCENCE_COLOR.saturation, PREVIEW_GFP_FLUORESCENCE_COLOR.lightness, PREVIEW_GFP_GLOW.externalOuterAlpha * alpha)
    );
    glow.addColorStop(1.0, _hsla(PREVIEW_GFP_FLUORESCENCE_COLOR.hue, PREVIEW_GFP_FLUORESCENCE_COLOR.saturation, PREVIEW_GFP_FLUORESCENCE_COLOR.lightness, 0));

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function _drawPreviewInternalGfpGlow(ctx, cx, cy, radius, gfpValue, baseAlpha) {
    const gfp = _normalizedGfp(gfpValue);
    if (gfp <= 0.001) {
        return;
    }

    // source-atop preserves the radial body alpha: preview glow changes the
    // perceived color and brightness but does not turn the cell opaque.
    const alpha = _clamp01(Math.pow(gfp, 0.46) * (0.92 + 0.08 * baseAlpha));
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(
        0.00,
        _hsla(PREVIEW_GFP_FLUORESCENCE_COLOR.hue, PREVIEW_GFP_FLUORESCENCE_COLOR.saturation, PREVIEW_GFP_FLUORESCENCE_COLOR.lightness, PREVIEW_GFP_GLOW.internalCoreAlpha * alpha)
    );
    glow.addColorStop(
        0.38,
        _hsla(PREVIEW_GFP_FLUORESCENCE_COLOR.hue, PREVIEW_GFP_FLUORESCENCE_COLOR.saturation, PREVIEW_GFP_FLUORESCENCE_COLOR.lightness, PREVIEW_GFP_GLOW.internalMidAlpha * alpha)
    );
    glow.addColorStop(
        0.82,
        _hsla(PREVIEW_GFP_FLUORESCENCE_COLOR.hue, PREVIEW_GFP_FLUORESCENCE_COLOR.saturation, PREVIEW_GFP_FLUORESCENCE_COLOR.lightness, PREVIEW_GFP_GLOW.internalEdgeAlpha * alpha)
    );
    glow.addColorStop(1.00, _hsla(PREVIEW_GFP_FLUORESCENCE_COLOR.hue, PREVIEW_GFP_FLUORESCENCE_COLOR.saturation, PREVIEW_GFP_FLUORESCENCE_COLOR.lightness, 0));

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function _normalizedGfp(gfpValue) {
    return _clamp01(Number(gfpValue ?? 0) / 100.0);
}

function _fluorescentLightnessBoost(lightness, gfp) {
    const strength = Math.pow(_clamp01(gfp), 0.50);
    return _clamp(lightness + PREVIEW_GFP_GLOW.bodyLightnessBoost * strength, 0, 96);
}

function _fluorescentSaturationBoost(saturation, gfp) {
    return _clamp(saturation + PREVIEW_GFP_GLOW.bodySaturationBoost * _clamp01(gfp), 0, 100);
}

function _hsla(hue, saturation, lightness, alpha) {
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${_clamp01(alpha).toFixed(3)})`;
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

    const alpha = _previewAlpha(PREVIEW_REAL_CELL_OPACITY);
    const gfp = _normalizedGfp(state.cellDraft.genome.gfp);
    const lightness = _fluorescentLightnessBoost(state.cellDraft.genome.lightness, gfp);
    const saturation = _fluorescentSaturationBoost(state.cellDraft.genome.saturation, gfp);
    _drawPreviewExternalGfpGlow(ctx2, centerX, centerY, previewRadius, state.cellDraft.genome.gfp, alpha);
    _fillPreviewCellRadialHsl(
        ctx2,
        centerX,
        centerY,
        previewRadius,
        state.cellDraft.genome.colorHue,
        saturation,
        lightness,
        alpha
    );
    _drawPreviewInternalGfpGlow(ctx2, centerX, centerY, previewRadius, state.cellDraft.genome.gfp, alpha);

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
