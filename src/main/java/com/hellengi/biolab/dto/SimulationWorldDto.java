package com.hellengi.biolab.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record SimulationWorldDto(
        long tick,
        double time,
        double foodSpawnProgress,
        int tubeDiameter,
        List<CellDto> cells,
        List<FoodDto> foods,
        LightingDto lighting
) {
    @JsonProperty("type")
    public String type() {
        return "world";
    }
}