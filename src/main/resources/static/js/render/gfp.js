// Shared GFP rendering parameters and helper.
// Both simulation canvas and preview use this module, so GFP glow stays visually consistent.

export const GFP_GLOW = Object.freeze({
    internalCoreAlpha: 1.00,
    internalMidAlpha: 0.74,
    internalEdgeAlpha: 0.24,
    internalInnerRadiusFactor: 0.025,
    internalOuterRadiusFactor: 0.96,
    internalMidStop: 0.36,
    internalEdgeStop: 0.90,
    bodyLightnessBoost: 18,
    bodySaturationBoost: 24,
});

export function drawInternalGfpGlow(ctx, options = {}) {
    const {
        x,
        y,
        radius,
        color = {r: 83, g: 255, b: 139},
        expression = 0,
        baseAlpha = 1,
        rgba,
    } = options;

    if (!ctx || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius <= 0) return;
    if (typeof rgba !== "function") return;

    const strength = _clamp01(expression);
    if (strength <= 0.001) return;

    const alpha = _clamp01(Math.pow(strength, 0.46) * (0.92 + 0.08 * _clamp01(baseAlpha)));
    const glow = ctx.createRadialGradient(
        x,
        y,
        radius * GFP_GLOW.internalInnerRadiusFactor,
        x,
        y,
        radius * GFP_GLOW.internalOuterRadiusFactor
    );
    glow.addColorStop(0.00, rgba(color, GFP_GLOW.internalCoreAlpha * alpha));
    glow.addColorStop(GFP_GLOW.internalMidStop, rgba(color, GFP_GLOW.internalMidAlpha * alpha));
    glow.addColorStop(GFP_GLOW.internalEdgeStop, rgba(color, GFP_GLOW.internalEdgeAlpha * alpha));
    glow.addColorStop(1.00, rgba(color, 0));

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function _clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
}
