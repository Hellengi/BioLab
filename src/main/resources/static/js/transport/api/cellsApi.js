import { getJson, postJson, del } from "./_http.js";

export function getTemplates() {
    return getJson("/api/cells/templates");
}

export function getTemplate(id) {
    return getJson(`/api/cells/templates/${id}`);
}

export async function saveTemplate(name, template) {
    await fetch(`/api/cells/templates?name=${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
    });
}

export function deleteTemplate(id) {
    return del(`/api/cells/templates/${id}`);
}

export function spawnCell(x, y, cell) {
    return postJson("/api/cells/spawn", {x, y, genome: cell.genome});
}