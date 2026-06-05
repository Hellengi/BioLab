/**
 * ui/panels/cursor.js
 * Всё, что связано с курсором над canvas:
 *  – запрос фактической освещённости под курсором у backend
 *  – привязка mouse-событий canvas
 *  – обновление DOM-индикатора освещённости
 */

import { dom } from "../dom.js";
import { state, setCursorLight } from "../../store/state.js";
import { getLightAt } from "../../transport/api/simulation.js";
import { getCanvasCameraState, isWorldPointInsideCanvas, screenPointToWorld } from "./canvas-camera.js";

const CURSOR_LIGHT_REQUEST_INTERVAL_MS = 60;

let cursorInsideCanvas = false;
let latestCursorPoint = null;
let cursorLightTimer = null;
let cursorLightInFlight = false;
let latestRequestId = 0;

// ── Привязка событий ─────────────────────────────────────────────────────────

/**
 * Вешает обработчики мыши на canvas.
 * Вызывать один раз при инициализации.
 * @param {HTMLCanvasElement} canvas
 */
export function bindCanvasMouseEvents(canvas) {
    canvas.addEventListener("mousemove", _onCanvasMouseMove);
    canvas.addEventListener("mouseleave", _onCanvasMouseLeave);
}

// ── Обработчики событий ──────────────────────────────────────────────────────

function _onCanvasMouseMove(event) {
    if (!state.world) return;

    const point = canvasPointFromMouseEvent(event);
    if (!isWorldPointInsideCanvas(point)) {
        _onCanvasMouseLeave();
        return;
    }

    cursorInsideCanvas = true;
    latestCursorPoint = point;

    // Light probing is a hover/readout feature. During camera manipulation it
    // must not generate backend requests, because right-button pan and smooth
    // zoom should remain purely local canvas interactions.
    if (shouldSuspendCursorLightProbe(event)) {
        cancelPendingCursorLightRequest({ invalidateInFlight: true });
        return;
    }

    scheduleCursorLightRequest();
}

function _onCanvasMouseLeave() {
    cursorInsideCanvas = false;
    latestCursorPoint = null;

    cancelPendingCursorLightRequest({ invalidateInFlight: true });

    setCursorLight(null);
    updateCursorReadout();
}

// ── Backend-пробник освещённости ─────────────────────────────────────────────

function canvasPointFromMouseEvent(event) {
    return screenPointToWorld(event);
}

function scheduleCursorLightRequest() {
    if (cursorLightTimer !== null || cursorLightInFlight || shouldSuspendCursorLightProbe()) {
        return;
    }

    cursorLightTimer = setTimeout(() => {
        cursorLightTimer = null;
        requestCursorLight();
    }, CURSOR_LIGHT_REQUEST_INTERVAL_MS);
}

async function requestCursorLight() {
    if (!cursorInsideCanvas || !latestCursorPoint || shouldSuspendCursorLightProbe()) {
        return;
    }

    const point = latestCursorPoint;
    const requestId = ++latestRequestId;
    cursorLightInFlight = true;

    try {
        const dto = await getLightAt(point.x, point.y);

        if (!cursorInsideCanvas || requestId !== latestRequestId) {
            return;
        }

        setCursorLight(dto.light ?? null);
        updateCursorReadout();
    } catch (err) {
        console.error("Cursor light probe error", err);
    } finally {
        cursorLightInFlight = false;

        if (cursorInsideCanvas && latestCursorPoint !== point && !shouldSuspendCursorLightProbe()) {
            scheduleCursorLightRequest();
        }
    }
}

function cancelPendingCursorLightRequest({ invalidateInFlight = false } = {}) {
    if (cursorLightTimer !== null) {
        clearTimeout(cursorLightTimer);
        cursorLightTimer = null;
    }

    if (invalidateInFlight) {
        latestRequestId += 1;
    }
}

function shouldSuspendCursorLightProbe(event = null) {
    if (event && (event.buttons & 2) === 2) {
        return true;
    }

    try {
        const camera = getCanvasCameraState();
        return Boolean(camera.dragging || camera.moving || camera.zooming);
    } catch (ignored) {
        return false;
    }
}

// ── Обновление DOM-индикатора ────────────────────────────────────────────────

/**
 * Обновляет текстовый индикатор освещённости под курсором.
 * Вызывается после получения ответа backend и при уходе с canvas.
 */
function updateCursorReadout() {
    if (!dom.cursorReadoutDisplay) return;

    const light = state.cursorLight;

    if (light === null) {
        dom.cursorReadoutDisplay.textContent = "—";
        dom.cursorReadoutDisplay.classList.remove("cursor-readout--active");
        return;
    }

    dom.cursorReadoutDisplay.textContent = `${(light * 100).toFixed(2)}%`;
    dom.cursorReadoutDisplay.classList.add("cursor-readout--active");
}




