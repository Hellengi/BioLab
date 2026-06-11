package com.hellengi.biolab.metrics;

import com.hellengi.biolab.dto.DisplayLayersDto;

public record BaselineScenarioRequestDto(
        String name,
        int cells,
        int food,
        boolean running,
        DisplayLayersDto displayLayers,
        Double globalLightPercent,
        Boolean globalLightCycleEnabled,
        Double globalLightCycleMinPercent,
        Double globalLightCyclePeriodSeconds,
        Boolean localLightSourcesEnabled,
        Integer lightSourceCount,
        Integer lightSourceStartAngle,
        Integer lightSourceBrightness,
        Integer lightSourceOrbitRadius,
        Integer lightSourceOrbitSpeed
) {
    public String normalizedName() {
        return (name == null || name.isBlank()) ? "manual" : name.trim();
    }

    public int safeCells() {
        return Math.max(0, cells);
    }

    public int safeFood() {
        return Math.max(0, food);
    }
}
