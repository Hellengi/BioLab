package com.hellengi.biolab.simulation.settings;

import com.hellengi.biolab.api.dto.SimulationSettingsDto;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.simulation.mapper.GenomeMapper;
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
                baseConfig.getWidth(),
                baseConfig.getHeight(),
                baseConfig.getTickRateMs(),
                runtimeConfig.getInitialCellCount(),
                baseConfig.getFood().getInitialCount(),
                runtimeConfig.getFoodSpawnIntensity(),
                baseConfig.getFood().getEnergyMin(),
                baseConfig.getFood().getEnergyRange(),
                baseConfig.getCell().getMinEnergy(),
                baseConfig.getCell().getEnergyDecay(),
                baseConfig.getCell().getViscosity(),
                runtimeConfig.getDeadCellLifetimeTicks(),
                baseConfig.getRender().getCellBaseRadius(),
                baseConfig.getRender().getCellRadiusScale(),
                baseConfig.getRender().getDirectionVectorLength(),
                baseConfig.getRender().getFoodBaseRadius(),
                runtimeConfig.getTimeSlider(),
                runtimeConfig.isPaused(),
                runtimeConfig.getSpeedFactor(),
                runtimeConfig.getTemperatureCelsius(),
                baseConfig.getTime().getMinSpeedFactor(),
                baseConfig.getTime().getMaxSpeedFactor(),
                genomeMapper.toDto(baseConfig.getGenome().getInitial())
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
}