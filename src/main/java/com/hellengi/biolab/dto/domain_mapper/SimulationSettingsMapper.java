package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import com.hellengi.biolab.dto.RangedValueDto;
import com.hellengi.biolab.dto.SimulationSettingsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SimulationSettingsMapper {
    private final YamlConfig baseConfig;
    private final GenomeMapper genomeMapper;

    public SimulationSettingsDto toDto(RuntimeOverrides runtimeConfig) {
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
                runtimeConfig.isLocalLightSourcesEnabled(),
                control(runtimeConfig.getLightSourceCount(), baseConfig.getControls().getLightSourceCount()),
                control(runtimeConfig.getLightSourceStartAngle(), baseConfig.getControls().getLightSourceStartAngle()),
                control(Math.round(runtimeConfig.getLightSourceBrightness() * 100), baseConfig.getControls().getLightSourceBrightness()),
                control(runtimeConfig.getLightSourceOrbitRadius(), baseConfig.getControls().getLightSourceOrbitRadius()),
                control(runtimeConfig.getLightSourceOrbitSpeed(), baseConfig.getControls().getLightSourceOrbitSpeed()),
                baseConfig.getTubeDiameter(), baseConfig.getTickRateMs(), runtimeConfig.isPaused(),
                runtimeConfig.getSpeedFactor(), runtimeConfig.getTemperatureCelsius(),
                runtimeConfig.getViscosity(), runtimeConfig.getGravity(),
                baseConfig.getCell().getBaseRadius(), baseConfig.getCell().getEnergyToRadiusFactor(),
                baseConfig.getFood().getBaseRadius(), baseConfig.getFood().getStart(),
                baseConfig.getFood().getMinEnergy(), baseConfig.getFood().getMaxEnergy(),
                baseConfig.getCell().getDeathEnergy(), baseConfig.getCell().getEnergyDecayPerTick(),
                genomeMapper.toSettingsDto(baseConfig.getGenome()),
                control(baseConfig.getMotion().getCellSpeed().getInitial(), baseConfig.getMotion().getCellSpeed()),
                control(baseConfig.getMotion().getCellDirection().getInitial(), baseConfig.getMotion().getCellDirection())
        );
    }

    private RangedValueDto control(double value, YamlConfig.Control control) {
        return new RangedValueDto(value, control.getMin(), control.getMax(), control.getStep(), control.getInitial());
    }
}
