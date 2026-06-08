package com.hellengi.biolab.dto;

public record FoodDto(
        long id,
        double x,
        double y,
        double energy,
        double radius,
        boolean consumed,
        Long capturedByCellId,
        int digestionSlotIndex,
        boolean insideLysosome,
        Double capturedCellAnchorX,
        Double capturedCellAnchorY
) {
}


