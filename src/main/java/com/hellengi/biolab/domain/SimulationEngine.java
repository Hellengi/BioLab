package com.hellengi.biolab.domain;

import com.hellengi.biolab.api.dto.CellDto;
import com.hellengi.biolab.api.dto.FoodDto;
import com.hellengi.biolab.api.dto.SimulationSettingsDto;
import com.hellengi.biolab.api.dto.SimulationWorldDto;
import com.hellengi.biolab.api.dto.SpawnCellRequestDto;
import com.hellengi.biolab.api.websocket.SimulationWorldBroadcaster;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import com.hellengi.biolab.domain.settings.SimulationSettings;
import com.hellengi.biolab.domain.spawn.CellFactory;
import com.hellengi.biolab.domain.spawn.FoodFactory;
import com.hellengi.biolab.mapper.api.CellMapper;
import com.hellengi.biolab.mapper.api.FoodMapper;
import com.hellengi.biolab.mapper.api.SimulationWorldMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * The only public entry point that can trigger simulation mutations.
 * Package-local processors execute ordered stages only while this engine holds the world lock.
 */
@Service
@RequiredArgsConstructor
public class SimulationEngine {
    private final YamlConfig baseConfig;
    private final RuntimeOverrides runtimeConfig;
    private final SimulationSettings simulationSettings;
    private final SimulationWorld world;
    private final SimulationClock clock;
    private final CellFactory cellFactory;
    private final FoodFactory foodFactory;
    private final CellMapper cellMapper;
    private final FoodMapper foodMapper;
    private final SimulationWorldMapper stateMapper;
    private final SimulationWorldBroadcaster stateBroadcaster;
    private final LightingProcessor lightingProcessor;
    private final PhysicsProcessor physicsProcessor;
    private final CellLifecycleProcessor cellLifecycleProcessor;
    private final FoodSpawnProcessor foodSpawnProcessor;
    private final WorldValidator worldValidator;

    public record PersistentSnapshot(SimulationWorldDto state, SimulationSettingsDto settings) {
    }

    @PostConstruct
    private void init() {
        reset();
    }

    /** Called only by SimulationLoop. */
    public void poll() {
        SimulationWorldDto snapshot = null;
        synchronized (world) {
            double speedFactor = runtimeConfig.getSpeedFactor();
            if (speedFactor > 0.0) {
                SimulationClock.StepBatch batch = clock.dueSteps(speedFactor);
                for (long i = 0L; i < batch.steps(); i++) {
                    performSimulationStep(batch.tickScale());
                }
            } else {
                clock.resetStepReference();
            }

            if (clock.isBroadcastDue()) {
                lightingProcessor.syncConfiguredState(world);
                snapshot = currentState();
            }
        }
        if (snapshot != null) {
            stateBroadcaster.broadcast(snapshot);
        }
    }

    public void reset() {
        synchronized (world) {
            world.clear();
            clock.reset();
            for (int i = 0; i < runtimeConfig.getInitialCellCount(); i++) {
                world.addCell(cellFactory.createRandomCell());
            }
            for (int i = 0; i < baseConfig.getFood().getStart(); i++) {
                world.addFood(foodFactory.createRandomFood());
            }
            lightingProcessor.reset(world);
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

    public void loadSnapshot(SimulationWorldDto stateDto, SimulationSettingsDto settingsDto) {
        if (stateDto == null) {
            throw new IllegalArgumentException("Simulation snapshot must not be null");
        }
        synchronized (world) {
            runtimeConfig.applySnapshot(settingsDto);
            runtimeConfig.pause();
            world.clear();
            world.setTick(stateDto.tick());
            world.setFoodSpawnProgress(stateDto.foodSpawnProgress());
            double phaseTicks = stateDto.globalLightCycleElapsedTicks();
            world.setGlobalLightCycleElapsedTicks(phaseTicks);
            for (CellDto dto : stateDto.cells()) {
                world.addCell(cellMapper.toDomain(dto));
            }
            for (FoodDto dto : stateDto.foods()) {
                world.addFood(foodMapper.toDomain(dto));
            }
            lightingProcessor.loadSnapshot(world, stateDto.lighting());
            clock.reset();
        }
    }

    public SimulationWorldDto getState() {
        synchronized (world) {
            lightingProcessor.syncConfiguredState(world);
            return currentState();
        }
    }

    public PersistentSnapshot createPersistentSnapshot() {
        synchronized (world) {
            lightingProcessor.syncConfiguredState(world);
            return new PersistentSnapshot(currentState(), simulationSettings.getConfig());
        }
    }

    public SimulationSettingsDto getConfig() {
        synchronized (world) {
            return simulationSettings.getConfig();
        }
    }

    public SimulationSettingsDto updateConfig(SimulationSettingsDto configDto) {
        synchronized (world) {
            SimulationSettingsDto updated = simulationSettings.updateConfig(configDto);
            lightingProcessor.syncConfiguredState(world);
            if (runtimeConfig.getSpeedFactor() <= 0.0) {
                clock.resetStepReference();
            }
            return updated;
        }
    }

    public SimulationSettingsDto resetConfigToDefaults() {
        synchronized (world) {
            SimulationSettingsDto defaults = simulationSettings.resetToDefaults();
            world.setGlobalLightCycleElapsedTicks(0.0);
            lightingProcessor.syncConfiguredState(world);
            if (runtimeConfig.getSpeedFactor() <= 0.0) {
                clock.resetStepReference();
            }
            return defaults;
        }
    }

    private SimulationWorldDto currentState() {
        return stateMapper.toDto(world, clock.measuredTps(), runtimeConfig.getSpeedFactor() > 0.0);
    }

    private void performSimulationStep(double tickScale) {
        advanceTick();
        processLighting(tickScale);
        processPhysics(tickScale);
        processCells(tickScale);
        processPeriodicFood(tickScale);
        removeInvalidObjects();
        removeMarkedObjects();
    }

    private void advanceTick() {
        world.incrementTick();
        clock.recordProcessedTick();
    }

    private void processLighting(double tickScale) {
        lightingProcessor.process(world, tickScale);
    }

    private void processPhysics(double tickScale) {
        physicsProcessor.process(world, tickScale);
    }

    private void processCells(double tickScale) {
        cellLifecycleProcessor.process(world, tickScale);
    }

    private void processPeriodicFood(double tickScale) {
        foodSpawnProcessor.process(world, tickScale);
    }

    private void removeInvalidObjects() {
        worldValidator.markInvalidObjects(world);
    }

    private void removeMarkedObjects() {
        world.removeMarkedCells();
        world.removeMarkedFoods();
    }
}
