import { hash01 } from "./render-utils.js";

const DEFAULT_LAYOUT = Object.freeze({
    maxVisible: 6,
    nucleusRadiusFactor: 0.28,
    minDistanceFactor: 0.82,
    marginMin: 0.18,
    marginFactor: 0.018,
    desiredStart: 0.18,
    desiredSpan: 0.76,
    attempts: 12,
    radialScoreWeight: 0.20,
    angularScoreWeight: 0.04,
    overlapPenalty: 10_000,
    overlapPenaltyFactor: 1_000,
});

export function buildSlotIndex(slots = []) {
    const map = new Map();
    for (const slot of slots ?? []) {
        const index = Math.round(Number(slot?.index));
        if (Number.isFinite(index)) map.set(index, slot);
    }
    return map;
}

export function radialOrganelleLayouts(seed, count, radius, slots = [], radiusForSlot, options = {}) {
    const cfg = {...DEFAULT_LAYOUT, ...options};
    const visibleCount = Math.min(cfg.maxVisible, Math.max(0, Math.round(count ?? 0)));
    const positions = [];
    const radii = [];
    const slotIndex = buildSlotIndex(slots);
    const nucleusRadius = radius * cfg.nucleusRadiusFactor;
    const margin = Math.max(cfg.marginMin, radius * cfg.marginFactor);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < visibleCount; i++) {
        radii[i] = radiusForSlot(radius, slotIndex.get(i), i);
    }

    for (let i = 0; i < visibleCount; i++) {
        const r = radii[i];
        let minDistance = Math.min(radius * cfg.minDistanceFactor, nucleusRadius + r + margin);
        const maxDistance = Math.max(0, radius - r - margin);
        if (maxDistance < minDistance) minDistance = maxDistance;

        const baseAngle = hash01(seed + 1709, i * 3 + 1) * Math.PI * 2;
        const radialHash = hash01(seed + 1709, i * 3 + 2);
        const desiredDistance = minDistance + (maxDistance - minDistance) * (cfg.desiredStart + cfg.desiredSpan * radialHash);
        let best = {
            x: Math.cos(baseAngle) * desiredDistance,
            y: Math.sin(baseAngle) * desiredDistance,
            score: Number.POSITIVE_INFINITY,
        };

        for (let attempt = 0; attempt < cfg.attempts; attempt++) {
            const angle = baseAngle + goldenAngle * attempt;
            const distanceT = hash01(seed + 1709, i * 97 + attempt * 7 + 11);
            const distance = attempt === 0 ? desiredDistance : minDistance + (maxDistance - minDistance) * distanceT;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            let score = Math.abs(distance - desiredDistance) * cfg.radialScoreWeight
                + Math.abs(Math.sin((angle - baseAngle) * 0.5)) * radius * cfg.angularScoreWeight;

            const nucleusGap = Math.hypot(x, y) - nucleusRadius - r - margin;
            if (nucleusGap < 0) score += cfg.overlapPenalty + Math.abs(nucleusGap) * cfg.overlapPenaltyFactor;

            const edgeGap = radius - Math.hypot(x, y) - r - margin;
            if (edgeGap < 0) score += cfg.overlapPenalty + Math.abs(edgeGap) * cfg.overlapPenaltyFactor;

            for (let j = 0; j < positions.length; j++) {
                const gap = Math.hypot(x - positions[j].x, y - positions[j].y) - r - radii[j] - margin;
                if (gap < 0) score += cfg.overlapPenalty + Math.abs(gap) * cfg.overlapPenaltyFactor;
            }

            if (score < best.score) best = {x, y, score};
        }

        positions[i] = {x: best.x, y: best.y, r, rotation: baseAngle * 0.25};
    }

    return positions;
}
