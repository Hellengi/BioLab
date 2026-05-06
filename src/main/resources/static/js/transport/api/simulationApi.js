import { getJson, putJson, del, request } from "./_http.js";

export function getConfig() {
    return getJson("/api/simulation/config");
}

export function updateConfig(payload) {
    return putJson("/api/simulation/config", payload).then(r => r.json());
}

export function resetConfig() {
    return request("/api/simulation/config/reset", { method: "POST" }).then(r => r.json());
}

export function getWorlds() {
    return getJson("/api/environments");
}

export function saveWorld(name) {
    return request(`/api/environments?name=${encodeURIComponent(name)}`, {
        method: "POST"
    }).then(response => response.json());
}

export function loadWorld(id) {
    return request(`/api/environments/${id}/load`, { method: "POST" });
}

export function deleteWorld(id) {
    return del(`/api/environments/${id}`);
}

export function resetSimulation() {
    return request("/api/simulation/reset", { method: "POST" });
}