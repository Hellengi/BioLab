package com.hellengi.biolab.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SimulationMetricsDto(
        long tps
) {
    @JsonProperty("type")
    public String type() {
        return "metrics";
    }
}