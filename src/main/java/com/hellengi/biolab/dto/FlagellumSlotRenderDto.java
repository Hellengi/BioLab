package com.hellengi.biolab.dto;

/**
 * Realtime flagellum geometry/state used for drawing. Accounting fields such as
 * torque and repair/damage rates stay in selected-cell details, but force is
 * required in the hot render stream because it drives the visible beat amplitude.
 */
public record FlagellumSlotRenderDto(
        int index,
        double motorPower,
        double damage,
        double performance,
        double baseX,
        double baseY,
        double directionX,
        double directionY,
        double length,
        double thickness,
        double force
) {
}


