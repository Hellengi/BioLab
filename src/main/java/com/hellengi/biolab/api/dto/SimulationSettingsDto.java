package com.hellengi.biolab.api.dto;

public record SimulationSettingsDto(
        int width,
        int height,
        long tickRateMs,
        int initialCellCount,
        int initialFoodCount,
        int foodSpawnIntensity,
        double foodEnergyMin,
        double foodEnergyRange,
        double minCellEnergy,
        double cellEnergyDecayPerTick,
        double viscosity,
        long deadCellLifetimeTicks,

        double cellBaseRadius,
        double cellRadiusScale,
        double directionVectorLength,
        double foodBaseRadius,

        double timeSlider,
        boolean paused,
        double speedFactor,
        double temperatureCelsius,
        double minSpeedFactor,
        double maxSpeedFactor,

        GenomeDto initialGenome
) {
}