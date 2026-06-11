import { getJson, putJsonForJson, post, postForJson, del } from "./_http.js";

export function getConfig() {
    return getJson("/api/simulation/config");
}

export function updateConfig(payload) {
    return putJsonForJson("/api/simulation/config", payload);
}

export function resetConfig() {
    return postForJson("/api/simulation/config/reset");
}

export function getWorlds() {
    return getJson("/api/simulation/snapshots");
}

export function saveWorld(name) {
    return postForJson(`/api/simulation/snapshots?name=${encodeURIComponent(name)}`);
}

export function loadWorld(id) {
    return post(`/api/simulation/snapshots/${id}/load`);
}

export function deleteWorld(id) {
    return del(`/api/simulation/snapshots/${id}`);
}

export function resetSimulation() {
    return post("/api/simulation/reset");
}

export function getLightAt(x, y) {
    const query = new URLSearchParams({
        x: String(x),
        y: String(y),
    });

    return getJson(`/api/simulation/light?${query.toString()}`);
}
