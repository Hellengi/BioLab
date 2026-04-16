package com.hellengi.biolab.dto;

public record SimulationConfigDto(
        int worldWidth,
        int worldHeight,
        long simulationTickRateMs,
        int initialSaprotrophCount,
        int initialFoodCount,
        int foodGenerationIntensity,
        double foodEnergyMin,
        double foodEnergyRange,
        double minCellEnergy,
        double saprotrophBaseEnergyDecayPerTick,
        double cellViscosityFactor,
        long deadCellLifetimeTicks,
        double clientSaprotrophBaseRadius,
        double clientSaprotrophRadiusScale,
        double clientDirectionVectorLength,
        double clientFoodRadiusAtMinEnergy
) {
}