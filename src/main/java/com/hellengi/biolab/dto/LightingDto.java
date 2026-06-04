package com.hellengi.biolab.dto;

import java.util.List;

public record LightingDto(
        double globalLight,
        double cycleTick,
        List<LightSourceDto> sources,
        int gridStep,
        int gridWidth,
        int gridHeight,
        double[] lightMap,
        double[] opacityMap,
        double[] lightDirectionArrows,
        List<QuadtreeNodeDto> quadtreeNodes
) {
}
