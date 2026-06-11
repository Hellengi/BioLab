package com.hellengi.biolab.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Fast realtime render frame. It replaces the old WebSocket use of
 * SimulationWorldDto and avoids sending genomes, motion vectors, events and
 * detailed energy/damage flow for every cell on every frame.
 */
public record SimulationRenderFrameDto(
        long tick,
        double time,
        double foodSpawnProgress,
        int tubeDiameter,
        List<CellRenderDto> cells,
        List<FoodDto> foods,
        LightingDto lighting,
        Long tps
) {
    @JsonProperty("type")
    public String type() {
        return "renderFrame";
    }
}
