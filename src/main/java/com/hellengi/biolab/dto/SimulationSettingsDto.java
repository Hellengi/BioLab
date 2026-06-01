package com.hellengi.biolab.dto;

public record SimulationSettingsDto(
        RangedValueDto timeSlider,

        RangedValueDto initialCellCount,
        RangedValueDto foodSpawnIntensity,

        RangedValueDto gravitySlider,
        RangedValueDto viscositySlider,
        RangedValueDto turbiditySlider,
        RangedValueDto radiationSlider,

        RangedValueDto globalLightPercent,
        boolean globalLightCycleEnabled,
        RangedValueDto globalLightCycleMinPercent,
        RangedValueDto globalLightCyclePeriodSeconds,

        boolean localLightSourcesEnabled,
        RangedValueDto lightSourceCount,
        RangedValueDto lightSourceStartAngle,
        RangedValueDto lightSourceBrightness,
        RangedValueDto lightSourceOrbitRadius,
        RangedValueDto lightSourceOrbitSpeed,

        int tubeDiameter,
        long tickRateMs,
        boolean paused,
        double speedFactor,
        double temperatureCelsius,

        double viscosity,
        double gravity,

        double cellBaseRadius,
        double cellRadiusScale,
        double foodBaseRadius,

        int initialFoodCount,
        double foodEnergyMin,
        double foodEnergyMax,
        double minCellEnergy,
        double cellEnergyDecayPerTick,

        GenomeSettingsDto initialGenome,

        RangedValueDto initialCellSpeed,
        RangedValueDto initialCellDirection
) {
}