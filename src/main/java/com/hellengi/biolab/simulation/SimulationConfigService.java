package com.hellengi.biolab.simulation;

import com.hellengi.biolab.api.dto.GenomeDto;
import com.hellengi.biolab.api.dto.SimulationSettingsDto;
import com.hellengi.biolab.config.SimulationProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SimulationConfigService {
    private final SimulationProperties baseConfig;
    private final SimulationRuntimeConfig runtimeConfig;

    public SimulationSettingsDto getConfig() {
        SimulationProperties.GenomeProperties gp = baseConfig.getGenome();
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
                new GenomeDto(
                        gp.getInitial().getDivisionThreshold(),
                        gp.getInitial().getDivisionImpulse(),
                        gp.getInitial().getColorHue(),
                        gp.getInitial().getSaturation(),
                        gp.getInitial().getLightness(),
                        gp.getInitial().getMaxEnergy(),
                        null
                )
        );
    }

    public SimulationSettingsDto updateConfig(SimulationSettingsDto dto) {
        runtimeConfig.update(
                dto.initialCellCount(),
                dto.foodSpawnIntensity(),
                dto.deadCellLifetimeTicks()
        );
        return getConfig();
    }

    public SimulationSettingsDto resetToDefaults() {
        runtimeConfig.reset();
        return getConfig();
    }
}