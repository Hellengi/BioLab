/**
 * Centralized helpers for organelle energy values.
 *
 * The renderer and info panels use this module instead of hard-coding the
 * display format in each organelle-specific UI branch. Multiple-instance
 * organelles are detected automatically by the conventional `<scope>Slots`
 * arrays and by the existing legacy aliases (lysosomeSlots, flagellumSlots).
 */

const SLOT_ALIASES = Object.freeze({
    nucleoid: ["nucleusSlots"],
    nucleus: ["nucleusSlots"],
    chloroplast: ["chloroplastSlots", "chloroplastsSlots", "cpSlots"],
    lysosome: ["lysosomeSlots", "lysosomesSlots"],
    flagellum: ["flagellumSlots", "flagellaSlots"],
});

const DIRECT_FIELD_ALIASES = Object.freeze({
    chloroplast: {
        production: ["chloroplastEnergyProductionRate", "chloroplastEnergyProduction", "cpEnergyProductionRate", "cpEnergyProduction", "energyProduction"],
        consumption: ["chloroplastEnergyCostRate", "chloroplastEnergyConsumptionRate", "cpEnergyCostRate", "cpEnergyConsumptionRate"],
    },
    lysosome: {
        production: ["lysosomeEnergyProductionRate", "lysosomeEnergyProduction", "digestionEnergyProduction"],
        consumption: ["lysosomeEnergyCostRate", "lysosomeEnergyConsumptionRate", "digestionEnergyCostRate", "lysosomeRepairEnergyCostRate"],
    },
    flagellum: {
        production: ["flagellumEnergyProductionRate", "flagellumEnergyProduction"],
        consumption: ["flagellumEnergyCostRate", "flagellumEnergyConsumptionRate", "flagellumRepairEnergyCostRate"],
    },
    membrane: {
        production: ["membraneEnergyProductionRate", "membraneEnergyProduction"],
        consumption: ["membraneEnergyCostRate", "membraneEnergyConsumptionRate", "membraneRepairEnergyCostRate"],
    },
    cytosol: {
        production: ["cytosolEnergyProductionRate", "cytosolEnergyProduction"],
        consumption: ["cytosolEnergyCostRate", "cytosolEnergyConsumptionRate", "repairEnergyCostRate"],
    },
    nucleus: {
        production: ["nucleusEnergyProductionRate", "nucleusEnergyProduction", "nucleoidEnergyProductionRate", "nucleoidEnergyProduction"],
        consumption: ["nucleusEnergyCostRate", "nucleusEnergyConsumptionRate", "nucleoidEnergyCostRate", "nucleoidEnergyConsumptionRate", "nucleusRepairEnergyCostRate"],
    },
});

const CONSUMPTION_FALLBACK_SHARE = Object.freeze({
    nucleus: 0.13,
    nucleoid: 0.13,
    cytosol: 0.43,
    membrane: 0.18,
    chloroplast: 0.24,
    lysosome: 0.08,
});

export function normalizeEnergyScope(scope) {
    const normalized = String(scope ?? "general").toLowerCase();
    if (normalized === "nucleoid") return "nucleus";
    return normalized;
}

export function energyProductionFor(cell, scope) {
    return energyTotalFor(cell, scope, "production");
}

export function energyConsumptionFor(cell, scope) {
    return energyTotalFor(cell, scope, "consumption");
}

export function formatOrganelleEnergy(cell, scope, kind, formatNumber) {
    const formatter = typeof formatNumber === "function" ? formatNumber : defaultFormatter;
    const values = organelleEnergyValues(cell, scope, kind);
    const total = energyTotalFor(cell, scope, kind);

    if (values.length > 1) {
        return `${formatter(total)} (${formatter(Math.min(...values))} ~ ${formatter(Math.max(...values))})`;
    }

    return formatter(total);
}

export function organelleEnergyValues(cell, scope, kind) {
    const slots = organelleSlots(cell, scope);
    if (!slots.length) return [];

    return slots
        .map(slot => energyValueFromSlot(slot, kind))
        .filter(Number.isFinite)
        .map(value => Math.max(0, value));
}

export function organelleSlots(cell, scope) {
    if (!cell) return [];
    const normalized = normalizeEnergyScope(scope);
    const propertyNames = unique([
        `${normalized}Slots`,
        `${normalized}sSlots`,
        ...(SLOT_ALIASES[normalized] ?? []),
    ]);

    for (const propertyName of propertyNames) {
        const value = cell?.[propertyName];
        if (Array.isArray(value)) return value;
    }

    return [];
}

export function energyTotalFor(cell, scope, kind) {
    const normalized = normalizeEnergyScope(scope);
    const type = kind === "production" ? "production" : "consumption";
    const slotValues = organelleEnergyValues(cell, normalized, type);

    if (slotValues.length > 0) {
        return sum(slotValues);
    }

    if (normalized === "general") {
        return type === "production"
            ? positiveNumber(cell?.energyProduction) + positiveNumber(cell?.digestionEnergyProduction)
            : positiveNumber(cell?.energyConsumption);
    }

    const direct = directEnergyTotal(cell, normalized, type);
    if (direct > 0) return direct;

    if (type === "consumption") {
        return allocatedConsumptionFallback(cell, normalized);
    }

    return 0;
}

function energyValueFromSlot(slot, kind) {
    if (kind === "production") {
        return firstFiniteNumber(slot?.energyProductionRate, slot?.productionRate, slot?.energyProduction);
    }

    return positiveNumber(slot?.energyConsumptionRate)
        + positiveNumber(slot?.consumptionRate)
        + positiveNumber(slot?.energyCostRate)
        + positiveNumber(slot?.repairEnergyCostRate);
}

function directEnergyTotal(cell, scope, kind) {
    const names = directFieldNames(scope, kind);
    return names.reduce((total, name) => total + positiveNumber(cell?.[name]), 0);
}

function directFieldNames(scope, kind) {
    const cap = scope.charAt(0).toUpperCase() + scope.slice(1);
    const generic = kind === "production"
        ? [`${scope}EnergyProductionRate`, `${scope}EnergyProduction`, `${scope}ProductionRate`, `${scope}Production`]
        : [`${scope}EnergyConsumptionRate`, `${scope}EnergyConsumption`, `${scope}EnergyCostRate`, `${scope}ConsumptionRate`, `${scope}Consumption`];
    const capitalized = kind === "production"
        ? [`${cap}EnergyProductionRate`, `${cap}EnergyProduction`, `${cap}ProductionRate`, `${cap}Production`]
        : [`${cap}EnergyConsumptionRate`, `${cap}EnergyConsumption`, `${cap}EnergyCostRate`, `${cap}ConsumptionRate`, `${cap}Consumption`];

    return unique([
        ...generic,
        ...capitalized,
        ...(DIRECT_FIELD_ALIASES[scope]?.[kind] ?? []),
    ]);
}

function allocatedConsumptionFallback(cell, scope) {
    const total = positiveNumber(cell?.energyConsumption);
    const repair = positiveNumber(cell?.repairEnergyCostRate);
    const base = Math.max(0, total - repair);
    const share = CONSUMPTION_FALLBACK_SHARE[scope];

    if (typeof share !== "number") return 0;

    if (scope === "cytosol") return base * share + repair;
    if (scope === "membrane") return base * share + positiveNumber(cell?.membraneRepairEnergyCostRate);
    if (scope === "lysosome") {
        return base * share
            + positiveNumber(cell?.digestionEnergyCostRate)
            + positiveNumber(cell?.lysosomeRepairEnergyCostRate);
    }
    return base * share;
}

function firstFiniteNumber(...values) {
    for (const value of values) {
        const number = Number(value);
        if (Number.isFinite(number)) return number;
    }
    return NaN;
}

function positiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function sum(values) {
    return values.reduce((total, value) => total + positiveNumber(value), 0);
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function defaultFormatter(value) {
    const number = Number(value);
    return (Number.isFinite(number) ? number : 0).toFixed(2);
}
