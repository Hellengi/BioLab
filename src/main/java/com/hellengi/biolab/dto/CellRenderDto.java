package com.hellengi.biolab.dto;

import java.util.List;

/**
 * Lightweight per-frame cell payload used by the realtime WebSocket render stream.
 * It intentionally keeps only data needed to draw the cell with full visual quality.
 * Full diagnostic/inspection fields are sent separately through CellDetailsDto.
 */
public record CellRenderDto(
        long id,
        double x,
        double y,
        double vx,
        double vy,
        double angularVelocity,
        double energy,
        Double maxEnergy,
        double radius,
        double nucleusOffsetX,
        double nucleusOffsetY,
        double nucleusRadius,
        double nucleusTargetOffsetX,
        double nucleusTargetOffsetY,
        boolean dead,
        long lifetimeTicks,
        double localLight,
        double mass,
        Double dryMass,
        double density,
        Double opacity,
        double nucleusDamage,
        double cellDamage,
        double cpDamage,
        double membraneDamage,
        double lysosomeDamage,
        double flagellumDamage,
        double membraneLightTransmittance,
        int lysosomeCapacity,
        int lysosomeOccupiedSlots,
        List<LysosomeSlotRenderDto> lysosomeSlots,
        int flagellumCapacity,
        List<FlagellumSlotRenderDto> flagellumSlots,
        CellVisualDto visual,
        double directionAngle
) {
}
