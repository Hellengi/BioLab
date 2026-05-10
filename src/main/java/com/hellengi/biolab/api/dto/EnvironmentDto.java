package com.hellengi.biolab.api.dto;

import java.util.List;

public record EnvironmentDto(
        long tick,
        long tps,
        int tubeDiameter,
        boolean running,
        List<CellDto> cells,
        List<CellDto> deadCells,
        List<FoodDto> foods,
        LightingDto lighting
) {
}