export const ORGANIC_BROWN_COLOR = Object.freeze({
    h: 22,
    s: 43,
    l: 33,
    hex: "#7a4b2f",
});

export function organicBrownHsl(lightness = ORGANIC_BROWN_COLOR.l) {
    return `hsl(${ORGANIC_BROWN_COLOR.h}, ${ORGANIC_BROWN_COLOR.s}%, ${lightness}%)`;
}
