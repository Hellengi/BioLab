package com.hellengi.biolab.simulation;

import com.hellengi.biolab.api.dto.*;
import com.hellengi.biolab.model.Cell;
import com.hellengi.biolab.simulation.factory.SpawnFactory;
import com.hellengi.biolab.simulation.mapper.CellMapper;
import com.hellengi.biolab.simulation.mapper.FoodMapper;
import com.hellengi.biolab.simulation.settings.RuntimeOverrides;
import com.hellengi.biolab.simulation.world.WorldInitializer;
import com.hellengi.biolab.simulation.world.WorldState;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SimulationControl {
    private final WorldState env;
    private final RuntimeOverrides runtimeConfig;
    private final WorldInitializer worldInitializer;
    private final SpawnFactory spawnFactory;
    private final CellMapper cellMapper;
    private final FoodMapper foodMapper;

    @PostConstruct
    private void init() {
        reset();
    }

    public void reset() {
        synchronized (env) {
            worldInitializer.initialize(
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
            Cell cell = spawnFactory.createCell(
                    requestDto.genome(),
                    requestDto.x(),
                    requestDto.y()
            );

            env.getCells().add(cell);
        }
    }

    public void loadSnapshot(EnvironmentDto envDto, SimulationSettingsDto configDto) {
        synchronized (env) {
            runtimeConfig.apply(configDto);
            runtimeConfig.pause();
            env.setRunning(false);

            env.setTick(envDto.tick());
            env.clear();

            for (CellDto dto : envDto.cells()) {
                env.getCells().add(cellMapper.toCell(dto));
            }
            for (CellDto dto : envDto.deadCells()) {
                env.getDeadCells().add(cellMapper.toDeadCell(dto));
            }
            for (FoodDto dto : envDto.foods()) {
                env.getFoods().add(foodMapper.toFood(dto));
            }
            env.setLastSimulationStepTimeNs(System.nanoTime());
        }
    }
}