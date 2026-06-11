package com.hellengi.biolab.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Dedicated light/debug-map payload. Maps are sent at their actual simulation
 * grid resolution; throttling happens by frame cadence, not by losing samples.
 */
public record SimulationLightingFrameDto(
        long tick,
        double time,
        LightingDto lighting
) {
    @JsonProperty("type")
    public String type() {
        return "lightingFrame";
    }
}
