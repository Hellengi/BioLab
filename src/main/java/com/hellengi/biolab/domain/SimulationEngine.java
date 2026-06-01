package com.hellengi.biolab.domain;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.lifecycle.Lifecycle;
import com.hellengi.biolab.domain.physics.Lighting;
import com.hellengi.biolab.domain.physics.Motion;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import com.hellengi.biolab.domain.spawn.CellFactory;
import com.hellengi.biolab.domain.spawn.FoodFactory;
import com.hellengi.biolab.domain.spawn.WorldValidator;
import com.hellengi.biolab.dto.*;
import com.hellengi.biolab.dto.domain_mapper.SimulationSettingsMapper;
import com.hellengi.biolab.dto.domain_mapper.SimulationWorldMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SimulationEngine {
    private final YamlConfig baseConfig;
    private final RuntimeOverrides runtimeConfig;
    private final SimulationWorld world;
    private final SimulationClock clock;
    private final CellFactory cellFactory;
    private final FoodFactory foodFactory;
    private final SimulationWorldMapper worldMapper;
    private final SimulationSettingsMapper settingsMapper;
    private final Lighting lighting;
    private final Motion motion;
    private final Lifecycle lifecycle;
    private final WorldValidator worldValidator;

    @PostConstruct
    private void init() {
        reset();
    }

    public boolean poll() {
        synchronized (world) {
            double speedFactor = runtimeConfig.getSpeedFactor();
            if (speedFactor > 0.0) {
                SimulationClock.StepBatch batch = clock.dueSteps(speedFactor);
                for (long i = 0L; i < batch.steps(); i++) {
                    performSimulationStep(batch.tickScale());
                }
            } else {
                clock.resetSimulationStepTimer();
            }
            return clock.isBroadcastDue();
        }
    }

    public void reset() {
        synchronized (world) {
            world.clear();
            clock.reset();
            int cellAmount = runtimeConfig.getInitialCellCount();
            int foodAmount = baseConfig.getFood().getStart();
            cellFactory.fill(world, cellAmount);
            foodFactory.fill(world, foodAmount);
            lighting.reset(world);
        }
    }

    public void spawnCell(SpawnCellRequestDto requestDto) {
        if (requestDto == null || requestDto.genome() == null) {
            throw new IllegalArgumentException("Cell genome must not be null");
        }
        synchronized (world) {
            world.addCell(cellFactory.createCell(requestDto));
        }
    }

    public void loadSnapshot(SnapshotDto snapshot) {
        if (snapshot == null || snapshot.world() == null) {
            throw new IllegalArgumentException("Simulation snapshot must not be null");
        }
        SimulationWorldDto worldDto = snapshot.world();
        synchronized (world) {
            runtimeConfig.apply(snapshot.settings());
            runtimeConfig.pause();
            world.clear();
            world.setTick(worldDto.tick());
            world.setTime(worldDto.time());
            world.setFoodSpawnBudget(worldDto.foodSpawnProgress());
            cellFactory.loadSnapshot(world, worldDto.cells());
            foodFactory.loadSnapshot(world, worldDto.foods());
            lighting.loadSnapshot(world, worldDto.lighting());
            clock.reset();
        }
    }

    public SnapshotDto createSnapshot() {
        synchronized (world) {
            return new SnapshotDto(
                    null,
                    null,
                    null,
                    worldMapper.toDto(world),
                    settingsMapper.toDto(runtimeConfig)
            );
        }
    }

    public SimulationMetricsDto getMetricsDto() {
        synchronized (world) {
            return new SimulationMetricsDto(clock.getMeasuredTps());
        }
    }

    public SimulationWorldDto getWorldDto() {
        synchronized (world) {
            return worldMapper.toDto(world);
        }
    }

    public SimulationSettingsDto getSettingsDto() {
        synchronized (world) {
            return settingsMapper.toDto(runtimeConfig);
        }
    }

    public SimulationSettingsDto updateSettings(SimulationSettingsDto dto) {
        synchronized (world) {
            runtimeConfig.apply(dto);
            lighting.applyRuntimeConfig(world);
            if (runtimeConfig.getSpeedFactor() <= 0.0) {
                clock.resetSimulationStepTimer();
            }
            return settingsMapper.toDto(runtimeConfig);
        }
    }

    public SimulationSettingsDto resetSettings() {
        synchronized (world) {
            runtimeConfig.reset();
            world.getGlobalLight().resetTick();
            lighting.applyRuntimeConfig(world);
            if (runtimeConfig.getSpeedFactor() <= 0.0) {
                clock.resetSimulationStepTimer();
            }
            return settingsMapper.toDto(runtimeConfig);
        }
    }

    private void performSimulationStep(double tickScale) {
        world.incrementTick(baseConfig.getTickRateMs() / 1000.0 * tickScale);
        clock.recordProcessedTick();
        lighting.process(world, tickScale);
        motion.process(world, tickScale);
        lifecycle.process(world, tickScale);
        foodFactory.process(world, tickScale);
        worldValidator.markInvalidObjects(world);
        world.assignMissingCellEventTimes();
        world.removeExpiredCellEvents();
        world.removeMarkedCells();
        world.removeMarkedFoods();
    }
}
