
import { getJson, postJson, postJsonForJson, del } from "./_http.js";

// ── Шаблоны клеток ────────────────────────────────────────────────────────────

/** Возвращает список всех сохранённых шаблонов. */
export function getTemplates() {
    return getJson("/api/cell/strains");
}

/** Возвращает шаблон по id. */
export function getTemplate(id) {
    return getJson(`/api/cell/strains/${id}`);
}

/**
 * Сохраняет шаблон клетки под заданным именем.
 * @param {string} name
 * @param {object} template — объект с genome и motion-полями
 */
export function saveTemplate(name, template) {
    return postJson(
        `/api/cell/strains?name=${encodeURIComponent(name)}`,
        template
    );
}

/** Удаляет шаблон по id. */
export function deleteTemplate(id) {
    return del(`/api/cell/strains/${id}`);
}

// ── Спавн ─────────────────────────────────────────────────────────────────────

/**
 * Создаёт клетку в указанных координатах canvas.
 * @param {number} x
 * @param {number} y
 * @param {object} cell
 */
export function spawnCell(x, y, cell) {
    return postJson("/api/cell/spawn", {
        x,
        y,
        genome:           cell.genome,
        initialSpeed:     cell.initialSpeed     ?? 0,
        initialDirection: cell.initialDirection ?? 0,
        startNucleusDamage:       cell.startNucleusDamage       ?? 0,
        startCytosolDamage:       cell.startCytosolDamage       ?? 0,
        startCpDamage:         cell.startCpDamage         ?? 0,
        startMembraneDamage:   cell.startMembraneDamage   ?? 0,
        startLysosomeDamage:   cell.startLysosomeDamage   ?? 0,
        startFlagellumDamage:  cell.startFlagellumDamage  ?? 0,
    });
}

export function previewCell(cell) {
    return postJsonForJson("/api/cell/preview", {
        x: 0,
        y: 0,
        genome: cell.genome,
        initialSpeed: cell.initialSpeed ?? 0,
        initialDirection: cell.initialDirection ?? 0,
        startNucleusDamage: cell.startNucleusDamage ?? 0,
        startCytosolDamage: cell.startCytosolDamage ?? 0,
        startCpDamage: cell.startCpDamage ?? 0,
        startMembraneDamage: cell.startMembraneDamage ?? 0,
        startLysosomeDamage: cell.startLysosomeDamage ?? 0,
        startFlagellumDamage: cell.startFlagellumDamage ?? 0,
    });
}
