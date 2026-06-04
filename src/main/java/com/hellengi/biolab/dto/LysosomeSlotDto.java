package com.hellengi.biolab.dto;

public record LysosomeSlotDto(
        int index,
        Long foodId,
        double damage,
        boolean occupied,
        double performance,
        double foodEnergy,
        double foodRadius,
        boolean foodInsideLysosome,
        double layoutX,
        double layoutY,
        double layoutRadius,
        double layoutRotation,
        double energyProductionRate,
        double energyCostRate,
        double damageRate,
        double repairRate,
        double repairEnergyCostRate
) {
}
