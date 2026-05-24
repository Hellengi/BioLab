const BG_DARK  = 40;
const BG_LIGHT = 200;
const BG_MAX   = 255;

function backgroundValue(illumination) {
    const illum = Math.max(0, illumination);

    if (illum <= 1) {
        return Math.round(BG_DARK + (BG_LIGHT - BG_DARK) * illum);
    }

    const linearSlope = BG_LIGHT - BG_DARK;
    const whiteGap = BG_MAX - BG_LIGHT;
    const k = linearSlope / whiteGap;

    return Math.round(
        BG_LIGHT + whiteGap * (1 - Math.exp(-k * (illum - 1)))
    );
}

export function drawBackground(ctx, lighting) {
    const lightMap = lighting?.lightMap ?? [];
    const cols = lighting?.gridWidth ?? 0;
    const rows = lighting?.gridHeight ?? 0;

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    if (!lightMap.length || cols <= 0 || rows <= 0) {
        const globalLight = lighting?.globalLight ?? 0.75;
        const v = backgroundValue(globalLight);

        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(0, 0, W, H);
        return;
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = cols;
    offscreen.height = rows;

    const octx = offscreen.getContext("2d");
    const img = octx.createImageData(cols, rows);
    const data = img.data;

    const globalLight = lighting?.globalLight ?? 0.75;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const idx = row * cols + col;
            const v = backgroundValue(lightMap[idx] ?? globalLight);

            const dataIdx = idx * 4;
            data[dataIdx] = v;
            data[dataIdx + 1] = v;
            data[dataIdx + 2] = v;
            data[dataIdx + 3] = 255;
        }
    }

    octx.putImageData(img, 0, 0);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.restore();
}

export function drawLightSourceBodies(ctx, lighting) {
    const sources = Array.isArray(lighting?.sources)
        ? lighting.sources
        : [];

    if (!sources.length) return;

    for (const source of sources) {
        ctx.save();

        const renderType = String(
            source.renderType ?? source.type ?? ""
        ).toUpperCase();

        if (renderType === "EDGE" || renderType === "WALL") {
            drawTrapezoidSource(ctx, source);
        } else {
            drawCircleSource(ctx, source);
        }

        ctx.restore();
    }
}

const CIRCLE_SOURCE_OUTER_RADIUS = 10;
const CIRCLE_SOURCE_INNER_RADIUS = 7;
const CIRCLE_SOURCE_CORE_RADIUS = 5;
const WALL_SOURCE_OUTER_WIDTH = 16;
const WALL_SOURCE_INNER_WIDTH = 12;
const WALL_SOURCE_DEPTH = 6;

function drawCircleSource(ctx, source) {
    const cx = source.x;
    const cy = source.y;

    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_SOURCE_OUTER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(226,232,240)';
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(148,163,184,0.95)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_SOURCE_INNER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(241,245,249)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_SOURCE_CORE_RADIUS, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
}

function drawTrapezoidSource(ctx, source) {
    const b = source.brightness ?? 1.0;
    const outwardAngle = source.angle ?? 0;
    const inwardAngle = outwardAngle + Math.PI;
    const perpAngle = outwardAngle + Math.PI / 2;

    const outerW = WALL_SOURCE_OUTER_WIDTH;
    const innerW = WALL_SOURCE_INNER_WIDTH;
    const depth = WALL_SOURCE_DEPTH;
    const cx = source.x, cy = source.y;
    const dx = Math.cos(perpAngle), dy = Math.sin(perpAngle);
    const ix = Math.cos(inwardAngle), iy = Math.sin(inwardAngle);

    ctx.beginPath();
    ctx.moveTo(cx - dx * outerW, cy - dy * outerW);
    ctx.lineTo(cx + dx * outerW, cy + dy * outerW);
    ctx.lineTo(cx + dx * innerW + ix * depth, cy + dy * innerW + iy * depth);
    ctx.lineTo(cx - dx * innerW + ix * depth, cy - dy * innerW + iy * depth);
    ctx.closePath();

    ctx.fillStyle = 'rgb(226,232,240)';
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(148,163,184,0.95)';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - dx * innerW * 0.65 + ix * depth * 0.55, cy - dy * innerW * 0.65 + iy * depth * 0.55);
    ctx.lineTo(cx + dx * innerW * 0.65 + ix * depth * 0.55, cy + dy * innerW * 0.65 + iy * depth * 0.55);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
}