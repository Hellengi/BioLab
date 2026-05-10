package com.hellengi.biolab.simulation;

import com.hellengi.biolab.api.dto.SimulationSettingsDto;
import com.hellengi.biolab.api.dto.SpawnCellRequestDto;
import com.hellengi.biolab.api.dto.EnvironmentDto;
import com.hellengi.biolab.simulation.lighting.LightingSystem;
import com.hellengi.biolab.simulation.mapper.EnvironmentMapper;
import com.hellengi.biolab.simulation.settings.RuntimeOverrides;
import com.hellengi.biolab.simulation.settings.SimulationSettings;
import com.hellengi.biolab.simulation.world.WorldState;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SimulationService {
    private final RuntimeOverrides runtimeConfig;
    private final WorldState world;
    private final EnvironmentMapper environmentMapper;
    private final SimulationControl simulationControl;
    private final SimulationSettings simulationSettings;
    private final LightingSystem lightingSystem;

    public void reset() {
        simulationControl.reset();
    }

    public EnvironmentDto getState() {
        lightingSystem.syncSourceCount();
        synchronized (world) {
            return environmentMapper.toDto(
                    world,
                    runtimeConfig.getDeadCellLifetimeTicks(),
                    0L,
                    lightingSystem.getSources(),
                    runtimeConfig.getGlobalLight()
            );
        }
    }

    public SimulationSettingsDto getConfig() {
        synchronized (world) {
            return simulationSettings.getConfig();
        }
    }

    public SimulationSettingsDto updateConfig(SimulationSettingsDto configDto) {
        synchronized (world) {
            return simulationSettings.updateConfig(configDto);
        }
    }

    public SimulationSettingsDto resetConfigToDefaults() {
        synchronized (world) {
            return simulationSettings.resetToDefaults();
        }
    }

    public void spawnCell(SpawnCellRequestDto requestDto) {
        simulationControl.spawnCell(requestDto);
    }
}