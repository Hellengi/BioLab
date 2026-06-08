/**
 * ui/panels/canvas-camera.js
 * Dynamic camera for the Environment viewport.
 *
 * The canvas fills the visible Environment viewport and render/canvas.js draws
 * the world through this camera transform. Camera movement only updates camera
 * coordinates; the main animation loop renders the scene from the current camera
 * state, so camera code must not request extra renders itself.
 */

import { dom } from "../dom.js";

const CAMERA_PADDING = 28;
const ORGANELLE_PANEL_WIDTH_PX = 320;
const ABSOLUTE_MIN_ZOOM = 0.025;
const MAX_ZOOM = 14.0;
const WHEEL_ZOOM_SPEED = 0.00135;
const WHEEL_SETTLE_DELAY_MS = 120;
const ZOOM_OUT_RELAXATION_FACTOR = 0.58;
const ZOOM_SMOOTH_TIME_CONSTANT_MS = 78;
const ZOOM_STOP_EPS = 0.00055;

const RETURN_TIME_CONSTANT_MS = 145;
const RETURN_STOP_EPS = 0.08;

const MOMENTUM_TIME_CONSTANT_MS = 255;
const MOMENTUM_LOW_SPEED_TIME_CONSTANT_MS = 72;
const MOMENTUM_LOW_SPEED_THRESHOLD_PX_PER_MS = 0.090;
const MOMENTUM_MIN_SPEED_PX_PER_MS = 0.045;
const MOMENTUM_STOP_SPEED_PX_PER_MS = 0.018;
const MOMENTUM_SAMPLE_WINDOW_MS = 90;
const MOMENTUM_RELEASE_GRACE_MS = 80;
const MOMENTUM_MIN_SAMPLE_DT_MS = 10;
const POINTER_SAMPLE_TIMEOUT_MS = 120;

const camera = {
    x: 0,
    y: 0,
    zoom: 1,
    targetX: 0,
    targetY: 0,
    targetZoom: 1,
    worldWidth: 1,
    worldHeight: 1,
    viewportWidth: 1,
    viewportHeight: 1,
    dpr: 1,
    initialized: false,
    dragging: false,
    pointerId: null,
    lastClientX: 0,
    lastClientY: 0,
    lastMoveTime: 0,
    dragStartClientX: 0,
    dragStartClientY: 0,
    dragStartCameraX: 0,
    dragStartCameraY: 0,
    dragSamples: [],
    velocityX: 0,
    velocityY: 0,
    motionAnimationId: 0,
    zoomAnimationId: 0,
    resizeAnimationId: 0,
    wheelSettleTimer: 0,
};

let eventsBound = false;

export function bindCanvasCameraEvents() {
    if (eventsBound) return;
    eventsBound = true;

    const host = cameraHost();
    if (!host) return;

    window.addEventListener("contextmenu", preventContextMenu, { capture: true });
    document.addEventListener("contextmenu", preventContextMenu, { capture: true });
    document.documentElement?.addEventListener("contextmenu", preventContextMenu, { capture: true });
    document.body?.addEventListener("contextmenu", preventContextMenu, { capture: true });
    document.addEventListener("mousedown", preventRightMouseDownDefault, { capture: true });
    document.addEventListener("mouseup", preventRightMouseUpDefault, { capture: true });
    document.addEventListener("auxclick", preventRightAuxClick, { capture: true });

    host.addEventListener("wheel", onWheel, { passive: false });
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", onPointerEnd);
    host.addEventListener("pointercancel", onPointerCancel);
    host.addEventListener("lostpointercapture", onLostPointerCapture);
    host.addEventListener("pointerleave", onPointerLeave);

    window.addEventListener("pointerup", onPointerEnd, { capture: true });
    window.addEventListener("pointercancel", onPointerCancel, { capture: true });
    window.addEventListener("resize", scheduleViewportSync);
    window.addEventListener("blur", cancelActiveDragWithoutMomentum);
    window.addEventListener("biolab:organelle-panel-visibility-change", onOrganellePanelVisibilityChange);
}

export function setCanvasWorldSize(width, height = width) {
    const nextWidth = Math.max(1, Number(width) || 1);
    const nextHeight = Math.max(1, Number(height) || nextWidth);
    const changed = camera.worldWidth !== nextWidth || camera.worldHeight !== nextHeight;

    camera.worldWidth = nextWidth;
    camera.worldHeight = nextHeight;

    if (dom.canvas) {
        dom.canvas.dataset.worldWidth = String(nextWidth);
        dom.canvas.dataset.worldHeight = String(nextHeight);
    }

    syncCanvasCameraToViewport({ reset: changed && !camera.initialized });
}

export function syncCanvasCameraToViewport({ reset = false } = {}) {
    const host = cameraHost();
    const canvas = dom.canvas;
    if (!host || !canvas) return;

    const resized = resizeCanvasToViewport();

    if (reset || !camera.initialized) {
        resetCameraToInitialView();
        return;
    }

    if (resized) {
        const clamped = clampedCameraPosition(camera.x, camera.y, camera.zoom);
        camera.x = clamped.x;
        camera.y = clamped.y;
        camera.targetX = clamped.x;
        camera.targetY = clamped.y;
        camera.targetZoom = camera.zoom;
    }

    applyCameraState();
}

export function getCanvasCameraState() {
    ensureCameraInitialized();

    return {
        x: camera.x,
        y: camera.y,
        zoom: camera.zoom,
        targetZoom: camera.targetZoom,
        worldWidth: camera.worldWidth,
        worldHeight: camera.worldHeight,
        viewportWidth: camera.viewportWidth,
        viewportHeight: camera.viewportHeight,
        dpr: camera.dpr,
        dragging: camera.dragging,
        moving: camera.dragging || camera.motionAnimationId !== 0 || camera.zoomAnimationId !== 0,
        zooming: camera.zoomAnimationId !== 0,
    };
}

export function getVisibleWorldBounds(extraPadding = 64) {
    const view = getCanvasCameraState();
    const pad = Math.max(0, Number(extraPadding) || 0);

    return {
        minX: Math.max(0, (-view.x) / view.zoom - pad),
        minY: Math.max(0, (-view.y) / view.zoom - pad),
        maxX: Math.min(view.worldWidth, (view.viewportWidth - view.x) / view.zoom + pad),
        maxY: Math.min(view.worldHeight, (view.viewportHeight - view.y) / view.zoom + pad),
    };
}

export function screenPointToWorld(event) {
    return clientPointToWorld(event.clientX, event.clientY);
}

export function clientPointToWorld(clientX, clientY) {
    const host = cameraHost();
    if (!host) return { x: 0, y: 0 };

    ensureCameraInitialized();

    const local = viewportLocalPoint(clientX, clientY);
    return {
        x: (local.x - camera.x) / camera.zoom,
        y: (local.y - camera.y) / camera.zoom,
    };
}

export function isWorldPointInsideCanvas(point) {
    if (!point) return false;
    return point.x >= 0
        && point.y >= 0
        && point.x <= camera.worldWidth
        && point.y <= camera.worldHeight;
}

function onOrganellePanelVisibilityChange(event) {
    if (event?.detail?.open === true) return;
    if (!camera.initialized) return;
    animateCameraBackIntoBounds();
}

function scheduleViewportSync() {
    if (camera.resizeAnimationId) return;
    camera.resizeAnimationId = requestAnimationFrame(() => {
        camera.resizeAnimationId = 0;
        syncCanvasCameraToViewport();
    });
}

function resizeCanvasToViewport() {
    const host = cameraHost();
    const canvas = dom.canvas;
    if (!host || !canvas) return false;

    const rect = host.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(rect.width || host.clientWidth || 1));
    const cssHeight = Math.max(1, Math.round(rect.height || host.clientHeight || 1));
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const backingWidth = Math.max(1, Math.round(cssWidth * dpr));
    const backingHeight = Math.max(1, Math.round(cssHeight * dpr));

    const changed = canvas.width !== backingWidth
        || canvas.height !== backingHeight
        || camera.viewportWidth !== cssWidth
        || camera.viewportHeight !== cssHeight
        || camera.dpr !== dpr;

    if (changed) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        camera.viewportWidth = cssWidth;
        camera.viewportHeight = cssHeight;
        camera.dpr = dpr;
    }

    const wrap = canvasWrap();
    if (wrap) {
        wrap.style.width = `${cssWidth}px`;
        wrap.style.height = `${cssHeight}px`;
        wrap.style.transform = "none";
    }

    return changed;
}

function resetCameraToInitialView() {
    resizeCanvasToViewport();
    cancelCameraMotion({ zoom: true });

    camera.zoom = clampZoom(settledMinimumZoom());

    const centered = centeredCameraPosition(camera.zoom);
    camera.x = centered.x;
    camera.y = centered.y;
    camera.targetX = camera.x;
    camera.targetY = camera.y;
    camera.targetZoom = camera.zoom;
    camera.initialized = true;

    applyCameraState();
}

function onWheel(event) {
    if (!dom.canvas || !cameraHost()) return;

    event.preventDefault();
    event.stopPropagation();
    ensureCameraInitialized();
    cancelPanMotionOnly();
    clearWheelSettleTimer();

    const local = viewportLocalPoint(event.clientX, event.clientY);
    const baseZoom = Math.max(
        ABSOLUTE_MIN_ZOOM,
        camera.zoomAnimationId ? camera.targetZoom : camera.zoom
    );
    const baseX = camera.zoomAnimationId ? camera.targetX : camera.x;
    const baseY = camera.zoomAnimationId ? camera.targetY : camera.y;
    const anchorWorld = {
        x: (local.x - baseX) / baseZoom,
        y: (local.y - baseY) / baseZoom,
    };

    const delta = normalizedWheelDelta(event);
    const nextZoom = clampWheelZoom(baseZoom * Math.exp(-delta * WHEEL_ZOOM_SPEED));

    camera.targetZoom = nextZoom;
    camera.targetX = local.x - anchorWorld.x * nextZoom;
    camera.targetY = local.y - anchorWorld.y * nextZoom;
    const clampedTarget = clampedCameraPosition(camera.targetX, camera.targetY, camera.targetZoom);
    camera.targetX = clampedTarget.x;
    camera.targetY = clampedTarget.y;
    camera.velocityX = 0;
    camera.velocityY = 0;

    startSmoothZoomAnimation();
    scheduleWheelSettle();
}

function onPointerDown(event) {
    if (event.button !== 2) return;

    event.preventDefault();
    event.stopPropagation();
    ensureCameraInitialized();
    cancelCameraMotion({ zoom: true });
    clearWheelSettleTimer();

    camera.dragging = true;
    camera.pointerId = event.pointerId;
    const now = performance.now();
    camera.lastClientX = event.clientX;
    camera.lastClientY = event.clientY;
    camera.lastMoveTime = now;
    camera.dragStartClientX = event.clientX;
    camera.dragStartClientY = event.clientY;
    camera.dragStartCameraX = camera.x;
    camera.dragStartCameraY = camera.y;
    camera.velocityX = 0;
    camera.velocityY = 0;
    resetDragSamples(now, event.clientX, event.clientY);

    cameraHost()?.classList.add("is-panning");

    try {
        cameraHost()?.setPointerCapture(event.pointerId);
    } catch (ignored) {
        // Pointer capture is a convenience, not a requirement.
    }
}

function onPointerMove(event) {
    if (!camera.dragging || event.pointerId !== camera.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    if ((event.buttons & 2) !== 2) {
        finishDrag(true, event.pointerId);
        return;
    }

    const now = performance.now();
    const dt = now - camera.lastMoveTime;
    const dx = event.clientX - camera.lastClientX;
    const dy = event.clientY - camera.lastClientY;

    camera.lastClientX = event.clientX;
    camera.lastClientY = event.clientY;
    camera.lastMoveTime = now;

    if (dt > POINTER_SAMPLE_TIMEOUT_MS) {
        resetDragSamples(now, event.clientX, event.clientY);
        return;
    }

    addDragSample(now, event.clientX, event.clientY);

    camera.x += dx;
    camera.y += dy;
    camera.targetX = camera.x;
    camera.targetY = camera.y;
    camera.targetZoom = camera.zoom;

    applyCameraState();
}

function onPointerEnd(event) {
    if (!camera.dragging || event.pointerId !== camera.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    finishDrag(true, event.pointerId);
}

function onPointerCancel(event) {
    if (!camera.dragging || event.pointerId !== camera.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    finishDrag(false, event.pointerId);
}

function onLostPointerCapture(event) {
    if (!camera.dragging || event.pointerId !== camera.pointerId) return;
    finishDrag(false, event.pointerId, { releaseCapture: false });
}

function onPointerLeave(event) {
    if (!camera.dragging || event.pointerId !== camera.pointerId) return;
    if ((event.buttons & 2) === 2) return;
    finishDrag(true, event.pointerId);
}

function cancelActiveDragWithoutMomentum() {
    if (!camera.dragging) return;
    finishDrag(false, camera.pointerId);
}

function finishDrag(useMomentum, pointerId, { releaseCapture = true } = {}) {
    const releaseTime = performance.now();
    const releaseVelocity = useMomentum ? dragVelocityAtRelease(releaseTime) : { x: 0, y: 0 };

    camera.dragging = false;
    camera.pointerId = null;
    camera.dragSamples = [];
    cameraHost()?.classList.remove("is-panning");

    if (releaseCapture && pointerId != null) {
        try {
            cameraHost()?.releasePointerCapture(pointerId);
        } catch (ignored) {
            // Pointer capture may already be released by the browser.
        }
    }

    if (useMomentum) {
        camera.velocityX = releaseVelocity.x;
        camera.velocityY = releaseVelocity.y;
        startMomentumOrReturn();
    } else {
        camera.velocityX = 0;
        camera.velocityY = 0;
        animateCameraBackIntoBounds();
    }
}


function resetDragSamples(time, clientX, clientY) {
    camera.dragSamples = [{ time, clientX, clientY }];
}

function addDragSample(time, clientX, clientY) {
    const samples = camera.dragSamples;
    const last = samples[samples.length - 1];

    if (!last || time > last.time) {
        samples.push({ time, clientX, clientY });
    } else if (last) {
        last.clientX = clientX;
        last.clientY = clientY;
    }

    const cutoff = time - MOMENTUM_SAMPLE_WINDOW_MS;
    while (samples.length > 2 && samples[0].time < cutoff) {
        samples.shift();
    }
}

function dragVelocityAtRelease(releaseTime) {
    const samples = camera.dragSamples;
    if (samples.length < 2) return { x: 0, y: 0 };

    const last = samples[samples.length - 1];
    if (releaseTime - last.time > MOMENTUM_RELEASE_GRACE_MS) {
        return { x: 0, y: 0 };
    }

    let first = samples[0];
    for (let i = samples.length - 2; i >= 0; i -= 1) {
        const candidate = samples[i];
        if (last.time - candidate.time >= MOMENTUM_MIN_SAMPLE_DT_MS) {
            first = candidate;
            break;
        }
    }

    const dt = last.time - first.time;
    if (dt < MOMENTUM_MIN_SAMPLE_DT_MS) return { x: 0, y: 0 };

    return {
        x: (last.clientX - first.clientX) / dt,
        y: (last.clientY - first.clientY) / dt,
    };
}

function startMomentumOrReturn() {
    const speed = Math.hypot(camera.velocityX, camera.velocityY);
    if (speed >= MOMENTUM_MIN_SPEED_PX_PER_MS) {
        startMomentumAnimation(camera.velocityX, camera.velocityY);
        return;
    }

    animateCameraBackIntoBounds();
}

function startMomentumAnimation(initialVelocityX, initialVelocityY) {
    cancelPanMotionOnly();

    let vx = Number(initialVelocityX) || 0;
    let vy = Number(initialVelocityY) || 0;
    let lastTime = performance.now();

    const step = now => {
        const dt = Math.min(34, Math.max(1, now - lastTime));
        lastTime = now;

        camera.x += vx * dt;
        camera.y += vy * dt;

        const speed = Math.hypot(vx, vy);
        const timeConstant = speed < MOMENTUM_LOW_SPEED_THRESHOLD_PX_PER_MS
            ? MOMENTUM_LOW_SPEED_TIME_CONSTANT_MS
            : MOMENTUM_TIME_CONSTANT_MS;
        const decay = Math.exp(-dt / timeConstant);
        vx *= decay;
        vy *= decay;

        const target = clampedCameraPosition(camera.x, camera.y, camera.zoom);
        const pull = 1 - Math.exp(-dt / RETURN_TIME_CONSTANT_MS);
        const outX = target.x - camera.x;
        const outY = target.y - camera.y;

        if (Math.abs(outX) > RETURN_STOP_EPS || Math.abs(outY) > RETURN_STOP_EPS) {
            camera.x += outX * pull;
            camera.y += outY * pull;
            vx *= 0.88;
            vy *= 0.88;
        }

        camera.targetX = camera.x;
        camera.targetY = camera.y;
        camera.targetZoom = camera.zoom;
        applyCameraState();

        const remainingSpeed = Math.hypot(vx, vy);
        const bounded = clampedCameraPosition(camera.x, camera.y, camera.zoom);
        const boundsDelta = Math.hypot(bounded.x - camera.x, bounded.y - camera.y);

        if (remainingSpeed <= MOMENTUM_STOP_SPEED_PX_PER_MS) {
            if (boundsDelta <= RETURN_STOP_EPS) {
                camera.x = bounded.x;
                camera.y = bounded.y;
                camera.velocityX = 0;
                camera.velocityY = 0;
                camera.targetX = camera.x;
                camera.targetY = camera.y;
                applyCameraState();
                camera.motionAnimationId = 0;
                return;
            }

            camera.motionAnimationId = 0;
            animateCameraBackIntoBounds();
            return;
        }

        camera.motionAnimationId = requestAnimationFrame(step);
    };

    camera.motionAnimationId = requestAnimationFrame(step);
}

function startSmoothZoomAnimation() {
    if (camera.zoomAnimationId) return;

    let lastTime = performance.now();

    const step = now => {
        const dt = Math.min(34, Math.max(1, now - lastTime));
        lastTime = now;
        const alpha = 1 - Math.exp(-dt / ZOOM_SMOOTH_TIME_CONSTANT_MS);

        camera.zoom += (camera.targetZoom - camera.zoom) * alpha;
        camera.x += (camera.targetX - camera.x) * alpha;
        camera.y += (camera.targetY - camera.y) * alpha;

        const clampedCurrent = clampedCameraPosition(camera.x, camera.y, camera.zoom);
        camera.x = clampedCurrent.x;
        camera.y = clampedCurrent.y;
        const clampedTarget = clampedCameraPosition(camera.targetX, camera.targetY, camera.targetZoom);
        camera.targetX = clampedTarget.x;
        camera.targetY = clampedTarget.y;

        applyCameraState();

        const zoomDelta = Math.abs(camera.targetZoom - camera.zoom);
        const positionDelta = Math.hypot(camera.targetX - camera.x, camera.targetY - camera.y);

        if (zoomDelta <= ZOOM_STOP_EPS && positionDelta <= RETURN_STOP_EPS) {
            camera.zoom = camera.targetZoom;
            camera.x = camera.targetX;
            camera.y = camera.targetY;
            applyCameraState();
            camera.zoomAnimationId = 0;
            return;
        }

        camera.zoomAnimationId = requestAnimationFrame(step);
    };

    camera.zoomAnimationId = requestAnimationFrame(step);
}

function scheduleWheelSettle() {
    clearWheelSettleTimer();
    camera.wheelSettleTimer = window.setTimeout(() => {
        camera.wheelSettleTimer = 0;
        settleZoomAfterWheel();
    }, WHEEL_SETTLE_DELAY_MS);
}

function settleZoomAfterWheel() {
    const minSettledZoom = settledMinimumZoom();

    if (camera.targetZoom < minSettledZoom - ZOOM_STOP_EPS) {
        animateZoomTo(minSettledZoom);
        return;
    }

    if (camera.zoomAnimationId) {
        const clamped = clampedCameraPosition(camera.targetX, camera.targetY, camera.targetZoom);
        camera.targetX = clamped.x;
        camera.targetY = clamped.y;
        return;
    }

    animateCameraBackIntoBounds();
}

function animateZoomTo(targetZoom) {
    const local = {
        x: camera.viewportWidth / 2,
        y: camera.viewportHeight / 2,
    };
    const currentZoom = Math.max(ABSOLUTE_MIN_ZOOM, camera.zoom);
    const anchorWorld = {
        x: (local.x - camera.x) / currentZoom,
        y: (local.y - camera.y) / currentZoom,
    };

    camera.targetZoom = clampZoom(targetZoom);
    camera.targetX = local.x - anchorWorld.x * camera.targetZoom;
    camera.targetY = local.y - anchorWorld.y * camera.targetZoom;

    const clamped = clampedCameraPosition(camera.targetX, camera.targetY, camera.targetZoom);
    camera.targetX = clamped.x;
    camera.targetY = clamped.y;

    startSmoothZoomAnimation();
}

function animateCameraBackIntoBounds() {
    if (camera.zoomAnimationId) {
        const clamped = clampedCameraPosition(camera.targetX, camera.targetY, camera.targetZoom);
        camera.targetX = clamped.x;
        camera.targetY = clamped.y;
        return;
    }

    const target = clampedCameraPosition(camera.x, camera.y, camera.zoom);

    if (Math.abs(target.x - camera.x) <= RETURN_STOP_EPS && Math.abs(target.y - camera.y) <= RETURN_STOP_EPS) {
        camera.x = target.x;
        camera.y = target.y;
        camera.targetX = camera.x;
        camera.targetY = camera.y;
        camera.targetZoom = camera.zoom;
        applyCameraState();
        return;
    }

    cancelPanMotionOnly();

    const startX = camera.x;
    const startY = camera.y;
    const startTime = performance.now();

    const step = now => {
        const elapsed = Math.max(0, now - startTime);
        const remaining = Math.exp(-elapsed / RETURN_TIME_CONSTANT_MS);

        camera.x = target.x + (startX - target.x) * remaining;
        camera.y = target.y + (startY - target.y) * remaining;
        camera.targetX = camera.x;
        camera.targetY = camera.y;
        camera.targetZoom = camera.zoom;

        applyCameraState();

        if (Math.abs(camera.x - target.x) <= RETURN_STOP_EPS && Math.abs(camera.y - target.y) <= RETURN_STOP_EPS) {
            camera.x = target.x;
            camera.y = target.y;
            camera.targetX = camera.x;
            camera.targetY = camera.y;
            applyCameraState();
            camera.motionAnimationId = 0;
            return;
        }

        camera.motionAnimationId = requestAnimationFrame(step);
    };

    camera.motionAnimationId = requestAnimationFrame(step);
}

function applyCameraState() {
    // Intentionally no render dispatch here. The app-level animation loop reads
    // camera.x / camera.y / camera.zoom every frame and renders from that state.
}

function clampedCameraPosition(x, y, zoom) {
    const width = camera.worldWidth * zoom;
    const height = camera.worldHeight * zoom;
    const viewportW = effectiveClampViewportWidth();
    const viewportH = camera.viewportHeight;

    return {
        x: clampAxis(x, viewportW, width),
        y: clampAxis(y, viewportH, height),
    };
}

function effectiveClampViewportWidth() {
    const occlusion = rightOrganellePanelOcclusionWidth();
    return Math.max(1, camera.viewportWidth - occlusion);
}

function rightOrganellePanelOcclusionWidth() {
    const panel = document.querySelector?.(".organelle-panel.panel-open");
    if (!panel) return 0;

    const cssWidth = getComputedStyle(document.documentElement).getPropertyValue("--organelle-panel-w");
    const parsed = Number.parseFloat(cssWidth);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : ORGANELLE_PANEL_WIDTH_PX;
}

function clampAxis(value, viewportSize, contentSize) {
    if (contentSize <= Math.max(1, viewportSize - CAMERA_PADDING * 2)) {
        return (viewportSize - contentSize) / 2;
    }

    const min = viewportSize - CAMERA_PADDING - contentSize;
    const max = CAMERA_PADDING;
    return clamp(value, min, max);
}

function centeredCameraPosition(zoom) {
    return {
        x: (camera.viewportWidth - camera.worldWidth * zoom) / 2,
        y: (camera.viewportHeight - camera.worldHeight * zoom) / 2,
    };
}

function settledMinimumZoom() {
    const fit = Math.min(
        (camera.viewportWidth - CAMERA_PADDING * 2) / camera.worldWidth,
        (camera.viewportHeight - CAMERA_PADDING * 2) / camera.worldHeight
    );

    return clampZoom(Math.min(1.0, Math.max(ABSOLUTE_MIN_ZOOM, fit)));
}

function relaxedMinimumZoom() {
    return Math.max(ABSOLUTE_MIN_ZOOM, settledMinimumZoom() * ZOOM_OUT_RELAXATION_FACTOR);
}

function ensureCameraInitialized() {
    if (!camera.initialized) {
        resetCameraToInitialView();
    }
}

function cancelCameraMotion({ zoom = true } = {}) {
    clearWheelSettleTimer();
    cancelPanMotionOnly();
    camera.dragSamples = [];
    if (zoom && camera.zoomAnimationId) {
        cancelAnimationFrame(camera.zoomAnimationId);
        camera.zoomAnimationId = 0;
        camera.targetX = camera.x;
        camera.targetY = camera.y;
        camera.targetZoom = camera.zoom;
    }
}

function cancelPanMotionOnly() {
    if (camera.motionAnimationId) {
        cancelAnimationFrame(camera.motionAnimationId);
        camera.motionAnimationId = 0;
    }
}

function clearWheelSettleTimer() {
    if (!camera.wheelSettleTimer) return;
    clearTimeout(camera.wheelSettleTimer);
    camera.wheelSettleTimer = 0;
}

function viewportLocalPoint(clientX, clientY) {
    const rect = cameraHost()?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
        x: clientX - rect.left,
        y: clientY - rect.top,
    };
}

function normalizedWheelDelta(event) {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * 240;
    return event.deltaY;
}

function cameraHost() {
    return dom.environmentScroll ?? null;
}

function canvasWrap() {
    return dom.environmentWrap ?? dom.canvas?.parentElement ?? null;
}

function preventContextMenu(event) {
    event.preventDefault();
    event.stopPropagation();
}

function preventRightMouseDownDefault(event) {
    if (event.button === 2) {
        event.preventDefault();
    }
}

function preventRightMouseUpDefault(event) {
    if (event.button === 2) {
        event.preventDefault();
    }
}

function preventRightAuxClick(event) {
    if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
    }
}

function clampWheelZoom(value) {
    return clamp(Number(value) || 1, relaxedMinimumZoom(), MAX_ZOOM);
}

function clampZoom(value) {
    return clamp(Number(value) || 1, ABSOLUTE_MIN_ZOOM, MAX_ZOOM);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}




