package com.hellengi.biolab.dto;

import java.util.List;

public record CellDto(
        long id,
        double x,
        double y,
        double vx,
        double vy,
        double energy,
        double radius,
        double nucleusOffsetX,
        double nucleusOffsetY,
        double nucleusRadius,
        double nucleusTargetOffsetX,
        double nucleusTargetOffsetY,
        boolean dead,
        GenomeDto genome,
        long lifetimeTicks,
        double localLight,
        double mass,
        double density,
        Double opacity,
        double cellDamage,
        double cpDamage,
        double lysosomeDamage,
        double energyProduction,
        double digestionEnergyProduction,
        double energyConsumption,
        double digestionEnergyCostRate,
        double cpPhotoDamageRate,
        double cellDamageRate,
        double lysosomeDamageRate,
        double cpRepairRate,
        double cellRepairRate,
        double lysosomeRepairRate,
        double repairEnergyCostRate,
        double lysosomeRepairEnergyCostRate,
        double carotProtection,
        double membraneLightTransmittance,
        int lysosomeCapacity,
        int lysosomeOccupiedSlots,
        List<LysosomeSlotDto> lysosomeSlots,
        List<CellEventDto> events,
        CellMotionDto motion,
        CellVisualDto visual,
        double directionAngle
) {
}


