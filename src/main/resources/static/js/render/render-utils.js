import { ORGANIC_BROWN_COLOR } from "./colors.js";

export function rgb(color, alpha = 1.0) {
    return `rgba(${Math.round(color?.r ?? 255)}, ${Math.round(color?.g ?? 255)}, ${Math.round(color?.b ?? 255)}, ${clamp01(alpha).toFixed(3)})`;
}

export function hsla(hue, saturation, lightness, alpha) {
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${clamp01(alpha).toFixed(3)})`;
}

export function organicBrownHsla(lightness, alpha) {
    return hsla(ORGANIC_BROWN_COLOR.h, ORGANIC_BROWN_COLOR.s, lightness, alpha);
}

export function grayscaleRgb(color) {
    if (!color) return color;
    const y = Math.round((color.r ?? 0) * 0.299 + (color.g ?? 0) * 0.587 + (color.b ?? 0) * 0.114);
    return { r: y, g: y, b: y, opacity: color.opacity };
}

export function seededRandom(seed) {
    let value = (seed >>> 0) || 1;
    return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 0x100000000;
    };
}

export function smoothstep(value) {
    const t = clamp01(value);
    return t * t * (3.0 - 2.0 * t);
}

export function clamp01(value) {
    if (!Number.isFinite(Number(value))) return 0;
    return Math.max(0, Math.min(1, Number(value)));
}
export function hash01(seed, salt) {
    let x = ((Math.floor(seed) * 374761393) ^ (Math.floor(salt) * 668265263)) >>> 0;
    x = (x ^ (x >>> 13)) >>> 0;
    x = Math.imul(x, 1274126177) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    return x / 0x100000000;
}



