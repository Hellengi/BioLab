package com.hellengi.biolab.dto;

/**
 * Realtime lysosome slot geometry/state used for drawing. Expensive rate and
 * accounting fields stay in the selected-cell details payload.
 */
public record LysosomeSlotRenderDto(
        int index,
        Long foodId,
        double damage,
        boolean occupied,
        double performance,
        double foodEnergy,
        double foodRadius,
        boolean foodInsideLysosome,
        double targetFoodRadius,
        double layoutX,
        double layoutY,
        double layoutRadius,
        double layoutRotation,
        double targetLayoutX,
        double targetLayoutY,
        double targetLayoutRadius,
        double targetLayoutRotation
) {
}
