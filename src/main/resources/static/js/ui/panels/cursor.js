/**
 * ui/panels/cursor.js
 * Всё, что связано с курсором над canvas:
 *  – определение освещённости под курсором (пробник света)
 *  – привязка mouse-событий canvas
 *  – обновление DOM-индикатора освещённости
 */

import { dom } from "../dom.js";
import { state, setCursorLight } from "../../store/state.js";

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
    const lighting = state.world?.lighting;
    if (!lighting) return;

    const rect = dom.canvas.getBoundingClientRect();
    const cx   = event.clientX - rect.left;
    const cy   = event.clientY - rect.top;

    setCursorLight(sampleLightAt(cx, cy, lighting));
    updateCursorReadout();
}

function _onCanvasMouseLeave() {
    setCursorLight(null);
    updateCursorReadout();
}

// ── Пробник освещённости ─────────────────────────────────────────────────────

/**
 * Возвращает значение освещённости в точке (cx, cy) canvas
 * на основе lightMap текущего кадра.
 * @param {number} cx
 * @param {number} cy
 * @param {object} lighting — объект lighting из state.world
 * @returns {number|null}
 */
function sampleLightAt(cx, cy, lighting) {
    const { lightMap, gridStep, gridWidth, gridHeight, globalLight } = lighting;

    if (!lightMap?.length || gridStep <= 0 || gridWidth <= 0 || gridHeight <= 0) {
        return globalLight ?? null;
    }

    const col        = Math.floor(cx / gridStep);
    const row        = Math.floor(cy / gridStep);
    const clampedCol = Math.max(0, Math.min(gridWidth  - 1, col));
    const clampedRow = Math.max(0, Math.min(gridHeight - 1, row));

    return lightMap[clampedRow * gridWidth + clampedCol] ?? globalLight;
}

// ── Обновление DOM-индикатора ────────────────────────────────────────────────

/**
 * Обновляет текстовый индикатор освещённости под курсором.
 * Вызывается при каждом движении мыши и при уходе с canvas.
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
