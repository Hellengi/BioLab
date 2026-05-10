package com.hellengi.biolab.api.dto;

import java.util.List;

public record LightingDto(
        double globalLight,
        List<LightSourceDto> sources,
        int gridStep,
        int gridWidth,
        int gridHeight,
        double[] lightMap
) {
}