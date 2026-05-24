/**
 * transport/api/cell.js
 * HTTP-клиент для работы с клетками: шаблоны и спавн.
 * Все запросы идут через единый хелпер _http.js.
 */

import { getJson, postJson, del } from "./_http.js";

// ── Шаблоны клеток ────────────────────────────────────────────────────────────

/** Возвращает список всех сохранённых шаблонов. */
export function getTemplates() {
    return getJson("/api/cells/templates");
}

/** Возвращает шаблон по id. */
export function getTemplate(id) {
    return getJson(`/api/cells/templates/${id}`);
}

/**
 * Сохраняет шаблон клетки под заданным именем.
 * @param {string} name
 * @param {object} template — объект с genome и motion-полями
 */
export function saveTemplate(name, template) {
    return postJson(
        `/api/cells/templates?name=${encodeURIComponent(name)}`,
        template
    );
}

/** Удаляет шаблон по id. */
export function deleteTemplate(id) {
    return del(`/api/cells/templates/${id}`);
}

// ── Спавн ─────────────────────────────────────────────────────────────────────

/**
 * Создаёт клетку в указанных координатах canvas.
 * @param {number} x
 * @param {number} y
 * @param {object} cell
 */
export function spawnCell(x, y, cell) {
    return postJson("/api/cells/spawn", {
        x,
        y,
        genome:           cell.genome,
        initialSpeed:     cell.initialSpeed     ?? 0,
        initialDirection: cell.initialDirection ?? 0,
    });
}