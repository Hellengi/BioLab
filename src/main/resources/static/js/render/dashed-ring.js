/**
 * Shared renderer for animated dashed circular overlays.
 *
 * Keep all dash geometry in one place so selection/debug rings stay visually
 * consistent while each caller can still tune color, radius and direction.
 */
export function drawAnimatedDashedCircle(ctx, options) {
    const x = Number(options?.x) || 0.0;
    const y = Number(options?.y) || 0.0;
    const radius = Number(options?.radius) || 0.0;
    if (!ctx || !Number.isFinite(radius) || radius <= 0.0) return;

    const strokeStyle = options.strokeStyle ?? "#ffffff";
    const lineWidth = Math.max(0.1, Number(options.lineWidth) || 1.0);
    const lineCap = options.lineCap ?? "round";
    const dashFraction = clamp(Number(options.dashFraction), 0.05, 0.95, 0.56);
    const targetSegmentLength = Math.max(1.0, Number(options.targetSegmentLength) || 38.0);
    const minSegments = Math.max(1, Math.round(Number(options.minSegments) || 8));
    const rotationsPerSecond = Number(options.rotationsPerSecond) || 0.0;
    const rotationDirection = options.rotationDirection === "counterclockwise" ? 1 : -1;

    const circumference = Math.PI * 2 * radius;
    const segmentCount = Math.max(minSegments, Math.round(circumference / targetSegmentLength));
    const segmentLength = circumference / segmentCount;
    const dashLength = segmentLength * dashFraction;
    const gapLength = Math.max(1.0, segmentLength - dashLength);
    const phase = (performance.now() * 0.001 * rotationsPerSecond) % 1;
    const offset = rotationDirection * circumference * phase;

    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = lineCap;
    if (Number.isFinite(options.alpha)) {
        ctx.globalAlpha *= clamp(Number(options.alpha), 0.0, 1.0, 1.0);
    }
    ctx.setLineDash([dashLength, gapLength]);
    ctx.lineDashOffset = offset;

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

function clamp(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
}
