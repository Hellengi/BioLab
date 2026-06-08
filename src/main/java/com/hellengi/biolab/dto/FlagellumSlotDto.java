package com.hellengi.biolab.dto;

public record FlagellumSlotDto(
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
        double force,
        double torque,
        double energyCostRate,
        double damageRate,
        double repairRate,
        double repairEnergyCostRate
) {
}
