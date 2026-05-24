package com.hellengi.biolab.domain.settings;

import com.hellengi.biolab.api.dto.RangedValueDto;
import com.hellengi.biolab.api.dto.SimulationSettingsDto;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.mapper.api.GenomeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SimulationSettings {
    private final YamlConfig baseConfig;
    private final RuntimeOverrides runtimeConfig;
    private final GenomeMapper genomeMapper;

    public SimulationSettingsDto getConfig() {
        return new SimulationSettingsDto(
                control(runtimeConfig.getTimeSlider(), baseConfig.getControls().getTime()),

                control(runtimeConfig.getInitialCellCount(), baseConfig.getCell().getStart()),
                control(runtimeConfig.getFoodSpawnIntensity(), baseConfig.getControls().getFoodSpawnIntensity()),

                control(runtimeConfig.getGravitySlider(), baseConfig.getControls().getGravity()),
                control(runtimeConfig.getViscositySlider(), baseConfig.getControls().getViscosity()),
                control(runtimeConfig.getTurbiditySlider(), baseConfig.getControls().getTurbidity()),
                control(runtimeConfig.getRadiationSlider(), baseConfig.getControls().getRadiation()),

                control(runtimeConfig.getStaticGlobalLight() * 100.0, baseConfig.getControls().getGlobalLight()),
                runtimeConfig.isGlobalLightCycleEnabled(),
                control(runtimeConfig.getGlobalLightCycleMin() * 100.0, baseConfig.getControls().getGlobalLightCycleMin()),
                control(runtimeConfig.getGlobalLightCyclePeriodSeconds(), baseConfig.getControls().getGlobalLightCyclePeriod()),
                0.0, // legacy snapshot field; live phase belongs to SimulationWorld

                runtimeConfig.isLocalLightSourcesEnabled(),
                control(runtimeConfig.getLightSourceCount(), baseConfig.getControls().getLightSourceCount()),
                control(runtimeConfig.getLightSourceStartAngle(), baseConfig.getControls().getLightSourceStartAngle()),
                control(Math.round(runtimeConfig.getLightSourceBrightness() * 100), baseConfig.getControls().getLightSourceBrightness()),
                control(runtimeConfig.getLightSourceOrbitRadius(), baseConfig.getControls().getLightSourceOrbitRadius()),
                control(runtimeConfig.getLightSourceOrbitSpeed(), baseConfig.getControls().getLightSourceOrbitSpeed()),

                baseConfig.getTubeDiameter(),
                baseConfig.getTickRateMs(),
                runtimeConfig.isPaused(),
                runtimeConfig.getSpeedFactor(),
                runtimeConfig.getTemperatureCelsius(),

                runtimeConfig.getViscosity(),
                runtimeConfig.getGravity(),

                baseConfig.getCell().getBaseRadius(),
                baseConfig.getCell().getEnergyToRadiusFactor(),
                baseConfig.getFood().getBaseRadius(),

                baseConfig.getFood().getStart(),
                baseConfig.getFood().getMinEnergy(),
                baseConfig.getFood().getMaxEnergy(),
                baseConfig.getCell().getDeathEnergy(),
                baseConfig.getCell().getEnergyDecayPerTick(),

                genomeMapper.toSettingsDto(baseConfig.getGenome()),
                control(
                        baseConfig.getMotion().getCellSpeed().getInitial(),
                        baseConfig.getMotion().getCellSpeed()
                ),
                control(
                        baseConfig.getMotion().getCellDirection().getInitial(),
                        baseConfig.getMotion().getCellDirection()
                )
        );
    }

    public SimulationSettingsDto updateConfig(SimulationSettingsDto configDto) {
        runtimeConfig.apply(configDto);
        return getConfig();
    }

    public SimulationSettingsDto resetToDefaults() {
        runtimeConfig.reset();
        return getConfig();
    }

    private RangedValueDto control(double value, YamlConfig.Control control) {
        return control(
                value,
                control.getMin(),
                control.getMax(),
                control.getStep(),
                control.getInitial()
        );
    }

    private RangedValueDto control(double value, double min, double max, double step, double initial) {
        return new RangedValueDto(value, min, max, step, initial);
    }
}