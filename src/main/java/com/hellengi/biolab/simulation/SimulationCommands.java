package com.hellengi.biolab.simulation;

import com.hellengi.biolab.api.dto.*;
import com.hellengi.biolab.model.Cell;
import com.hellengi.biolab.simulation.factory.EntityFactory;
import com.hellengi.biolab.simulation.world.EnvironmentInitializer;
import com.hellengi.biolab.simulation.world.SimulationEnvironment;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SimulationCommands {
    private final SimulationEnvironment env;
    private final SimulationRuntimeConfig runtimeConfig;
    private final EnvironmentInitializer environmentInitializer;
    private final EntityFactory entityFactory;
    private final EnvironmentMapper environmentMapper;

    @PostConstruct
    private void init() {
        reset();
    }

    public void start() {
        synchronized (env) {
            env.setRunning(true);
            env.setLastSimulationStepTimeMs(System.currentTimeMillis());
        }
    }

    public void stop() {
        synchronized (env) {
            env.setRunning(false);
            env.setLastSimulationStepTimeMs(System.currentTimeMillis());
        }
    }

    public void reset() {
        synchronized (env) {
            environmentInitializer.initialize(
                    env,
                    runtimeConfig.getInitialCellCount()
            );
        }
    }

    public void spawnCell(SpawnCellRequestDto requestDto) {
        if (requestDto == null || requestDto.genome() == null) {
            throw new IllegalArgumentException("Cell genome must not be null");
        }

        synchronized (env) {
            Cell cell = entityFactory.createCell(
                    requestDto.genome(),
                    requestDto.x(),
                    requestDto.y()
            );

            env.getCells().add(cell);
        }
    }

    public void loadSnapshot(EnvironmentDto envDto, SimulationSettingsDto configDto) {
        synchronized (env) {
            runtimeConfig.loadFromConfig(configDto);
            env.setRunning(envDto.running());
            env.setTick(envDto.tick());
            env.clear();

            for (CellDto dto : envDto.cells()) {
                env.getCells().add(environmentMapper.toCell(dto));
            }
            for (CellDto dto : envDto.deadCells()) {
                env.getDeadCells().add(environmentMapper.toDeadCell(dto));
            }
            for (FoodDto dto : envDto.foods()) {
                env.getFoods().add(environmentMapper.toFood(dto));
            }
            env.setLastSimulationStepTimeMs(System.currentTimeMillis());
        }
    }
}