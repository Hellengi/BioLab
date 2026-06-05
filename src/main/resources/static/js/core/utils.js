
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

export function formatPercent(value) {
    if (!Number.isFinite(value)) {
        return "—";
    }
    return `${formatTwoDecimals(value)}%`;
}

export function getCellRgbString(cell) {
    const rgb = cell?.visual?.cellColor;
    if (!rgb) return "—";
    const opacity = Number.isFinite(rgb.opacity) ? ` / opacity ${formatTwoDecimals(rgb.opacity)}` : "";
    return `${rgb.r}, ${rgb.g}, ${rgb.b}${opacity}`;
}

export function rgbString(rgb, alpha = 1.0) {
    if (!rgb) return `rgba(255,255,255,${clamp01(alpha).toFixed(3)})`;
    return `rgba(${rgb.r ?? 0}, ${rgb.g ?? 0}, ${rgb.b ?? 0}, ${clamp01(alpha).toFixed(3)})`;
}

export function preparePreviewCanvas(previewCtx, previewCanvas) {
    if (!previewCtx || !previewCanvas) {
        return null;
    }

    const rect = previewCanvas.getBoundingClientRect?.();
    const cssWidth = Math.max(
        1,
        Math.round(rect?.width || previewCanvas.clientWidth || previewCanvas.width || 1)
    );
    const cssHeight = Math.max(
        1,
        Math.round(rect?.height || previewCanvas.clientHeight || previewCanvas.height || 1)
    );
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const backingWidth = Math.max(1, Math.round(cssWidth * dpr));
    const backingHeight = Math.max(1, Math.round(cssHeight * dpr));

    if (previewCanvas.width !== backingWidth || previewCanvas.height !== backingHeight) {
        previewCanvas.width = backingWidth;
        previewCanvas.height = backingHeight;
    }

    previewCanvas.dataset.logicalWidth = String(cssWidth);
    previewCanvas.dataset.logicalHeight = String(cssHeight);
    previewCanvas.dataset.previewDpr = String(dpr);

    previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    previewCtx.imageSmoothingEnabled = true;
    previewCtx.imageSmoothingQuality = "high";
    previewCtx.clearRect(0, 0, cssWidth, cssHeight);
    previewCtx.fillStyle = "#181818";
    previewCtx.fillRect(0, 0, cssWidth, cssHeight);

    return { width: cssWidth, height: cssHeight, dpr };
}

export function setText(element, value) {
    if (!element) return;

    const nextText = String(value ?? "");
    if (element.textContent !== nextText) {
        element.textContent = nextText;
    }
}

export function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function clamp01(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}


