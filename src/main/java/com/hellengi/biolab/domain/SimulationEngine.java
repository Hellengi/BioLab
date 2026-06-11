package com.hellengi.biolab.domain;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.api.websocket.ClientViewport;
import com.hellengi.biolab.domain.lifecycle.Lifecycle;
import com.hellengi.biolab.domain.physics.Lighting;
import com.hellengi.biolab.domain.physics.Motion;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import com.hellengi.biolab.domain.spawn.CellFactory;
import com.hellengi.biolab.domain.spawn.FoodFactory;
import com.hellengi.biolab.domain.spawn.WorldValidator;
import com.hellengi.biolab.dto.*;
import com.hellengi.biolab.metrics.BaselineScenarioRequestDto;
import com.hellengi.biolab.metrics.PerformanceMetricsRegistry;
import com.hellengi.biolab.dto.domain_mapper.SimulationSettingsMapper;
import com.hellengi.biolab.dto.domain_mapper.SimulationWorldMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.function.Supplier;

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
    private final PerformanceMetricsRegistry performanceMetrics;

    @PostConstruct
    private void init() {
        reset();
    }

    public boolean poll() {
        return withWorldLock("poll", () -> {
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
        });
    }

    public void reset() {
        withWorldLock("reset", () -> {
            world.clear();
            clock.reset();
            int cellAmount = runtimeConfig.getInitialCellCount();
            int foodAmount = baseConfig.getFood().getStart();
            cellFactory.fill(world, cellAmount);
            foodFactory.fill(world, foodAmount);
            lighting.reset(world);
            return null;
        });
    }

    public void resetForBaseline(BaselineScenarioRequestDto scenario) {
        BaselineScenarioRequestDto safeScenario = scenario == null
                ? new BaselineScenarioRequestDto("manual", runtimeConfig.getInitialCellCount(), baseConfig.getFood().getStart(), true, DisplayLayersDto.off(), null, null, null, null, null, null, null, null, null, null)
                : scenario;

        withWorldLock("baselineReset", () -> {
            runtimeConfig.prepareForBaseline(safeScenario);
            world.clear();
            clock.reset();
            cellFactory.fill(world, safeScenario.safeCells());
            foodFactory.fill(world, safeScenario.safeFood());
            lighting.reset(world);
            performanceMetrics.incrementCounter("server.baseline.reset");
            performanceMetrics.setGauge("server.baseline.cells", safeScenario.safeCells());
            performanceMetrics.setGauge("server.baseline.food", safeScenario.safeFood());
            return null;
        });
    }

    public void spawnCell(SpawnCellRequestDto requestDto) {
        if (requestDto == null || requestDto.genome() == null) {
            throw new IllegalArgumentException("Cell genome must not be null");
        }
        withWorldLock("spawnCell", () -> {
            world.addCell(cellFactory.createCell(requestDto));
            lighting.invalidateLightCache();
            return null;
        });
    }

    public void loadSnapshot(SnapshotDto snapshot) {
        if (snapshot == null || snapshot.world() == null) {
            throw new IllegalArgumentException("Simulation snapshot must not be null");
        }
        SimulationWorldDto worldDto = snapshot.world();
        withWorldLock("loadSnapshot", () -> {
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
            return null;
        });
    }

    public SnapshotDto createSnapshot() {
        return withWorldLock("snapshot", () -> recordSnapshotCopy("snapshot", () -> new SnapshotDto(
                null,
                null,
                null,
                worldMapper.toSnapshotDto(world),
                settingsMapper.toDto(runtimeConfig)
        )));
    }

    public SimulationMetricsDto getMetricsDto() {
        return withWorldLock("metrics", () -> new SimulationMetricsDto(clock.getMeasuredTps()));
    }

    public SimulationWorldDto getWorldDto() {
        return getWorldDto(DisplayLayersDto.off());
    }

    public SimulationWorldDto getWorldDto(DisplayLayersDto displayLayers) {
        return withWorldLock("worldDto", () -> recordSnapshotCopy("worldDto", () -> worldMapper.toDto(world, displayLayers)));
    }

    public SimulationRenderFrameDto getRenderFrameDto(DisplayLayersDto displayLayers, Long tps) {
        return getRenderFrameDto(displayLayers, ClientViewport.FULL_WORLD, tps);
    }

    public SimulationRenderFrameDto getRenderFrameDto(DisplayLayersDto displayLayers, ClientViewport viewport, Long tps) {
        return withWorldLock("renderFrame", () -> recordSnapshotCopy("renderFrame", () -> worldMapper.toRenderFrameDto(world, displayLayers, viewport, tps)));
    }

    public SimulationLightingFrameDto getLightingFrameDto(DisplayLayersDto displayLayers) {
        return withWorldLock("lightingFrame", () -> recordSnapshotCopy("lightingFrame", () -> worldMapper.toLightingFrameDto(world, displayLayers)));
    }

    public CellDetailsDto getCellDetailsDto(DisplayLayersDto displayLayers) {
        return withWorldLock("cellDetails", () -> recordSnapshotCopy("cellDetails", () -> worldMapper.toCellDetailsDto(world, displayLayers)));
    }

    public SimulationSettingsDto getSettingsDto() {
        return withWorldLock("settings", () -> settingsMapper.toDto(runtimeConfig));
    }

    public LightProbeDto sampleLightAt(double x, double y) {
        if (!Double.isFinite(x) || !Double.isFinite(y)) {
            throw new IllegalArgumentException("Light probe coordinates must be finite");
        }

        return withWorldLock("lightProbe", () -> {
            int diameter = baseConfig.getTubeDiameter();

            double clampedX = Math.max(0.0, Math.min(diameter, x));
            double clampedY = Math.max(0.0, Math.min(diameter, y));

            double light = lighting.sampleLightAt(clampedX, clampedY);

            return new LightProbeDto(
                    clampedX,
                    clampedY,
                    light,
                    world.getTick(),
                    world.getTime()
            );
        });
    }

    public SimulationSettingsDto updateSettings(SimulationSettingsDto dto) {
        return withWorldLock("updateSettings", () -> {
            runtimeConfig.apply(dto);
            lighting.applyRuntimeConfig(world);
            if (runtimeConfig.getSpeedFactor() <= 0.0) {
                clock.resetSimulationStepTimer();
            }
            return settingsMapper.toDto(runtimeConfig);
        });
    }

    public SimulationSettingsDto resetSettings() {
        return withWorldLock("resetSettings", () -> {
            runtimeConfig.reset();
            world.getGlobalLight().resetTick();
            lighting.applyRuntimeConfig(world);
            if (runtimeConfig.getSpeedFactor() <= 0.0) {
                clock.resetSimulationStepTimer();
            }
            return settingsMapper.toDto(runtimeConfig);
        });
    }

    private <T> T withWorldLock(String operation, Supplier<T> action) {
        long waitStartNanos = System.nanoTime();
        synchronized (world) {
            long lockStartNanos = System.nanoTime();
            long waitNanos = lockStartNanos - waitStartNanos;
            performanceMetrics.recordDuration(PerformanceMetricsRegistry.SERVER_WORLD_LOCK_WAIT, waitNanos);
            performanceMetrics.recordDuration(PerformanceMetricsRegistry.SERVER_WORLD_LOCK_WAIT + "." + operation, waitNanos);
            try {
                return action.get();
            } finally {
                long holdNanos = System.nanoTime() - lockStartNanos;
                performanceMetrics.recordDuration(PerformanceMetricsRegistry.SERVER_WORLD_LOCK_HOLD, holdNanos);
                performanceMetrics.recordDuration(PerformanceMetricsRegistry.SERVER_WORLD_LOCK_HOLD + "." + operation, holdNanos);
            }
        }
    }

    private <T> T recordSnapshotCopy(String operation, Supplier<T> action) {
        long startNanos = System.nanoTime();
        try {
            return action.get();
        } finally {
            long elapsedNanos = System.nanoTime() - startNanos;
            performanceMetrics.recordDuration(PerformanceMetricsRegistry.SERVER_SNAPSHOT_COPY, elapsedNanos);
            performanceMetrics.recordDuration(PerformanceMetricsRegistry.SERVER_SNAPSHOT_COPY + "." + operation, elapsedNanos);
        }
    }

    private void recordTickStage(String name, Runnable action) {
        long startNanos = System.nanoTime();
        try {
            action.run();
        } finally {
            performanceMetrics.recordDuration("server.tick.stage." + name, System.nanoTime() - startNanos);
        }
    }

    private void performSimulationStep(double tickScale) {
        long startNanos = System.nanoTime();
        try {
            world.incrementTick(baseConfig.getTickRateMs() / 1000.0 * tickScale);
            clock.recordProcessedTick();
            recordTickStage("lighting", () -> lighting.process(world, tickScale));
            recordTickStage("motion", () -> motion.process(world, tickScale));
            recordTickStage("lifecycle", () -> lifecycle.process(world, tickScale));
            recordTickStage("food", () -> foodFactory.process(world, tickScale));
            recordTickStage("validation", () -> worldValidator.markInvalidObjects(world));
            recordTickStage("events", () -> {
                world.assignMissingCellEventTimes();
                world.removeExpiredCellEvents();
            });
            recordTickStage("cleanup", () -> {
                world.removeMarkedCells();
                world.removeMarkedFoods();
            });
            lighting.invalidateLightCache();
        } finally {
            long elapsedNanos = System.nanoTime() - startNanos;
            performanceMetrics.recordDuration(PerformanceMetricsRegistry.SERVER_TICK_TIME, elapsedNanos);
            performanceMetrics.recordDuration("server.tick.time.total", elapsedNanos);
        }
    }
}










