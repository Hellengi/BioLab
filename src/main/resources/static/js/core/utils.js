function roundTo(value, digits) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

export function formatTwoDecimals(value) {
    if (!Number.isFinite(value)) {
        return "—";
    }

    return roundTo(value, 2).toFixed(2);
}

export function getCellRgbString(cell) {
    if (!cell?.genome) {
        return "—";
    }

    const rgb = hslToRgb(
        cell.genome.colorHue,
        cell.genome.saturation,
        cell.genome.lightness
    );

    return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

function hslToRgb(h, s, l) {
    const hue = ((h % 360) + 360) % 360;
    const sat = Math.max(0, Math.min(100, s)) / 100;
    const lig = Math.max(0, Math.min(100, l)) / 100;

    const c = (1 - Math.abs(2 * lig - 1)) * sat;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = lig - c / 2;

    let rPrime = 0;
    let gPrime = 0;
    let bPrime = 0;

    if (hue < 60) {
        rPrime = c;
        gPrime = x;
    } else if (hue < 120) {
        rPrime = x;
        gPrime = c;
    } else if (hue < 180) {
        gPrime = c;
        bPrime = x;
    } else if (hue < 240) {
        gPrime = x;
        bPrime = c;
    } else if (hue < 300) {
        rPrime = x;
        bPrime = c;
    } else {
        rPrime = c;
        bPrime = x;
    }

    return {
        r: Math.round((rPrime + m) * 255),
        g: Math.round((gPrime + m) * 255),
        b: Math.round((bPrime + m) * 255)
    };
}

export function preparePreviewCanvas(previewCtx, previewCanvas) {
    if (!previewCtx || !previewCanvas) {
        return null;
    }

    const width = previewCanvas.width;
    const height = previewCanvas.height;

    previewCtx.clearRect(0, 0, width, height);
    previewCtx.fillStyle = "#181818";
    previewCtx.fillRect(0, 0, width, height);

    return { width, height };
}

export function setText(element, value) {
    if (element) {
        element.textContent = value;
    }
}

export function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
