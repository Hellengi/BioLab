export const Bioluminescence_GLOW = Object.freeze({
    internalFillAlpha: 0.74,
    bodyLightnessBoost: 18,
    bodySaturationBoost: 24,
});

export function drawInternalBioluminescenceGlow(ctx, options = {}) {
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

    const alpha = _clamp01(
        Math.pow(strength, 0.46)
        * (0.92 + 0.08 * _clamp01(baseAlpha))
        * Bioluminescence_GLOW.internalFillAlpha
    );

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = rgba(color, alpha);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function _clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
}
