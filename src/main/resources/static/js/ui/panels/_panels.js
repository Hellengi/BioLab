/**
 * ui/panels/_panels.js
 * Общие UI-утилиты: синхронизация input/range-пар, модальные окна,
 * координаты canvas, async-кнопки, применение границ к input-элементам.
 */

import { dom } from "../dom.js";

// ── Синхронизация слайдер + числовой input ───────────────────────────────────

/**
 * Связывает пару range+number так, чтобы они оставались синхронизированы.
 * @param {HTMLInputElement|null} rangeInput
 * @param {HTMLInputElement|null} numberInput
 * @param {Function} onInput  — вызывается при каждом изменении (preview)
 * @param {Function} [onCommit] — вызывается при фиксации значения (default = onInput)
 */
export function bindInputs(rangeInput, numberInput, onInput, onCommit = onInput) {
    if (!rangeInput || !numberInput) return;

    const syncFromRange  = () => { numberInput.value = rangeInput.value;  onInput(); };
    const syncFromNumber = () => { rangeInput.value  = numberInput.value; onInput(); };
    const commitFromRange  = () => { numberInput.value = rangeInput.value;  onCommit(); };
    const commitFromNumber = () => { rangeInput.value  = numberInput.value; onCommit(); };

    rangeInput.addEventListener("input",    syncFromRange);
    rangeInput.addEventListener("change",   commitFromRange);
    rangeInput.addEventListener("pointerup", commitFromRange);

    numberInput.addEventListener("input",  syncFromNumber);
    numberInput.addEventListener("change", commitFromNumber);
}

// ── Canvas-координаты ────────────────────────────────────────────────────────

/**
 * Возвращает координаты события мыши относительно canvas-элемента.
 * @param {MouseEvent} event
 * @returns {{ x: number, y: number }}
 */
export function getCanvasCoordinates(event) {
    const rect = dom.canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
}

// ── Модальные окна ────────────────────────────────────────────────────────────

export function openModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
}

export function closeModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
}

// ── Async-кнопки ─────────────────────────────────────────────────────────────

/**
 * Вешает обработчик click на кнопку. При ошибке логирует и показывает alert.
 * @param {HTMLElement|null} element
 * @param {Function} asyncHandler  — async-функция без аргументов
 * @param {string} logMessage      — текст для console.error
 * @param {string} alertMessage    — текст для alert()
 */
export function bindAsyncClick(element, asyncHandler, logMessage, alertMessage) {
    if (!element) return;
    element.addEventListener("click", () => {
        asyncHandler().catch(err => {
            console.error(logMessage, err);
            alert(alertMessage);
        });
    });
}

// ── Границы input-элемента ────────────────────────────────────────────────────

/**
 * Устанавливает атрибуты min/max/step на DOM input-элементе.
 * Работает как для range, так и для number input.
 * @param {HTMLInputElement|null} element
 * @param {{ min: number|string, max: number|string, step: number|string }} bounds
 */
export function applyInputBounds(element, { min, max, step }) {
    if (!element) return;
    element.min  = String(min);
    element.max  = String(max);
    element.step = String(step);
}