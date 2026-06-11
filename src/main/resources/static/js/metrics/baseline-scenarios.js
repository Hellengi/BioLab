export const BASELINE_SCENARIOS = Object.freeze([
    {
        id: "small-debug-off",
        name: "100 cells / 100 food / debug off",
        shortName: "100 cells / 100 food",
        cells: 100,
        food: 100,
        layers: layersOff(),
        syntheticClients: 0,
        lighting: lightingOff(),
    },
    {
        id: "medium-debug-off",
        name: "1000 cells / 1000 food / debug off",
        shortName: "1000 cells / 1000 food",
        cells: 1000,
        food: 1000,
        layers: layersOff(),
        syntheticClients: 0,
        lighting: lightingOff(),
    },
    {
        id: "large-debug-off",
        name: "5000 cells / 5000 food / debug off",
        shortName: "5000 cells / 5000 food",
        cells: 5000,
        food: 5000,
        layers: layersOff(),
        syntheticClients: 0,
        lighting: lightingOff(),
    },
    {
        id: "small-debug-maps",
        name: "100 cells / 100 food / lighting/debug maps on",
        shortName: "100 + debug maps",
        cells: 100,
        food: 100,
        layers: debugLayers(),
        syntheticClients: 0,
        lighting: lightingOff(),
    },
    {
        id: "small-local-lights",
        name: "100 cells / 100 food / local light sources on",
        shortName: "100 + light sources",
        cells: 100,
        food: 100,
        layers: layersOff(),
        syntheticClients: 0,
        lighting: localLightSources(),
    },
]);

export function scenarioById(id) {
    return BASELINE_SCENARIOS.find(scenario => scenario.id === id) ?? null;
}

export function layersOff() {
    return {
        opacityMap: false,
        directedLightMap: false,
        scatteredLightMap: false,
        lightDirection: false,
        quadtree: false,
        cellDirections: false,
        selectedCellId: null,
        selectedCellMode: "general",
    };
}

export function debugLayers() {
    return {
        opacityMap: true,
        directedLightMap: true,
        scatteredLightMap: true,
        lightDirection: true,
        quadtree: true,
        cellDirections: true,
        selectedCellId: null,
        selectedCellMode: "general",
    };
}

export function lightingOff() {
    return {
        localLightSourcesEnabled: false,
        lightSourceCount: 0,
        lightSourceBrightness: 0,
        lightSourceOrbitRadius: 0,
        lightSourceOrbitSpeed: 0,
        globalLightCycleEnabled: false,
    };
}

export function localLightSources() {
    return {
        localLightSourcesEnabled: true,
        lightSourceCount: 4,
        lightSourceBrightness: 100,
        lightSourceOrbitRadius: 70,
        lightSourceOrbitSpeed: 45,
        globalLightCycleEnabled: false,
    };
}

export function cloneScenario(scenario, overrides = {}) {
    return {
        ...scenario,
        ...overrides,
        layers: {
            ...(scenario?.layers ?? layersOff()),
            ...(overrides.layers ?? {}),
        },
        lighting: {
            ...(scenario?.lighting ?? lightingOff()),
            ...(overrides.lighting ?? {}),
        },
    };
}
