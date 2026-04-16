package com.hellengi.biolab.dto;

import java.util.List;

public record WorldStateDto(
        long tick,
        int width,
        int height,
        boolean running,
        int saprotrophCount,
        int deadCellCount,
        int foodCount,
        List<SaprotrophDto> saprotrophs,
        List<DeadCellDto> deadCells,
        List<FoodDto> foods
) {
}