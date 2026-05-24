package com.hellengi.biolab.api.dto;

import java.util.List;

/** Snapshot of mutable world state and read-only runtime display metrics. */
public record SimulationWorldDto(
        long tick,
        double globalLightCycleElapsedTicks,
        double foodSpawnProgress,
        long tps,
        int tubeDiameter,
        boolean running,
        List<CellDto> cells,
        List<FoodDto> foods,
        LightingDto lighting
) {
}