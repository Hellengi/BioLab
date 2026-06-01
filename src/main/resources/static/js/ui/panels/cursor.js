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

    cursorInsideCanvas = true;
    latestCursorPoint = canvasPointFromMouseEvent(event);
    scheduleCursorLightRequest();
}

function _onCanvasMouseLeave() {
    cursorInsideCanvas = false;
    latestCursorPoint = null;

    if (cursorLightTimer !== null) {
        clearTimeout(cursorLightTimer);
        cursorLightTimer = null;
    }

    setCursorLight(null);
    updateCursorReadout();
}

// ── Backend-пробник освещённости ─────────────────────────────────────────────

function canvasPointFromMouseEvent(event) {
    const rect = dom.canvas.getBoundingClientRect();

    return {
        x: (event.clientX - rect.left) * (dom.canvas.width / rect.width),
        y: (event.clientY - rect.top) * (dom.canvas.height / rect.height),
    };
}

function scheduleCursorLightRequest() {
    if (cursorLightTimer !== null || cursorLightInFlight) {
        return;
    }

    cursorLightTimer = setTimeout(() => {
        cursorLightTimer = null;
        requestCursorLight();
    }, CURSOR_LIGHT_REQUEST_INTERVAL_MS);
}

async function requestCursorLight() {
    if (!cursorInsideCanvas || !latestCursorPoint) {
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

        if (cursorInsideCanvas && latestCursorPoint !== point) {
            scheduleCursorLightRequest();
        }
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
