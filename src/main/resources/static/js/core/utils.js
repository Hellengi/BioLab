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
    const rgb = cell?.visual?.cellColor;
    if (!rgb) return "—";
    const opacity = Number.isFinite(rgb.opacity) ? ` / opacity ${formatTwoDecimals(rgb.opacity)}` : "";
    return `${rgb.r}, ${rgb.g}, ${rgb.b}${opacity}`;
}


export function preparePreviewCanvas(previewCtx, previewCanvas) {
    if (!previewCtx || !previewCanvas) {
        return null;
    }

    const rect = previewCanvas.getBoundingClientRect?.();
    const cssWidth = resolvePreviewCanvasCssSize(previewCanvas, rect?.width, "width");
    const cssHeight = resolvePreviewCanvasCssSize(previewCanvas, rect?.height, "height");
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

function resolvePreviewCanvasCssSize(previewCanvas, measuredSize, axis) {
    if (Number.isFinite(measuredSize) && measuredSize > 0) {
        return Math.max(1, Math.round(measuredSize));
    }

    const clientSize = axis === "width" ? previewCanvas.clientWidth : previewCanvas.clientHeight;
    if (Number.isFinite(clientSize) && clientSize > 0) {
        return Math.max(1, Math.round(clientSize));
    }

    const computed = window.getComputedStyle?.(previewCanvas);
    const computedSize = parseCssPixels(axis === "width" ? computed?.width : computed?.height);
    if (computedSize > 0) {
        return Math.max(1, Math.round(computedSize));
    }

    const previewSize = parseCssPixels(computed?.getPropertyValue?.("--preview-size"));
    if (previewSize > 0) {
        return Math.max(1, Math.round(previewSize));
    }

    const storedSize = Number(previewCanvas.dataset?.[axis === "width" ? "logicalWidth" : "logicalHeight"]);
    if (Number.isFinite(storedSize) && storedSize > 0) {
        return Math.max(1, Math.round(storedSize));
    }

    const attributeSize = Number(previewCanvas.getAttribute?.(axis));
    if (Number.isFinite(attributeSize) && attributeSize > 0) {
        return Math.max(1, Math.round(attributeSize));
    }

    const backingSize = axis === "width" ? previewCanvas.width : previewCanvas.height;
    return Math.max(1, Math.round(backingSize || 1));
}

function parseCssPixels(value) {
    if (typeof value !== "string") return 0;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
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



