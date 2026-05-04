package com.hellengi.biolab.simulation;

import com.hellengi.biolab.api.dto.SimulationSettingsDto;
import com.hellengi.biolab.api.dto.SpawnCellRequestDto;
import com.hellengi.biolab.api.dto.EnvironmentDto;
import com.hellengi.biolab.simulation.world.SimulationEnvironment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SimulationService {
    private final SimulationRuntimeConfig runtimeConfig;
    private final SimulationEnvironment world;
    private final EnvironmentMapper environmentMapper;
    private final SimulationCommands simulationCommands;
    private final SimulationConfigService simulationConfigService;

    public void start() {
        simulationCommands.start();
    }

    public void stop() {
        simulationCommands.stop();
    }

    public void reset() {
        simulationCommands.reset();
    }

    public EnvironmentDto getState() {
        synchronized (world) {
            return environmentMapper.toDto(
                    world,
                    runtimeConfig.getDeadCellLifetimeTicks()
            );
        }
    }

    public SimulationSettingsDto getConfig() {
        synchronized (world) {
            return simulationConfigService.getConfig();
        }
    }

    public SimulationSettingsDto updateConfig(SimulationSettingsDto configDto) {
        synchronized (world) {
            return simulationConfigService.updateConfig(configDto);
        }
    }

    public SimulationSettingsDto resetConfigToDefaults() {
        synchronized (world) {
            return simulationConfigService.resetToDefaults();
        }
    }

    public void spawnCell(SpawnCellRequestDto requestDto) {
        simulationCommands.spawnCell(requestDto);
    }
}