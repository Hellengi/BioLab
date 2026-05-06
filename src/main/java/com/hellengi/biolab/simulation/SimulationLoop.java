package com.hellengi.biolab.simulation;

import com.hellengi.biolab.api.dto.EnvironmentDto;
import com.hellengi.biolab.api.presentation.RenderMetrics;
import com.hellengi.biolab.api.websocket.EnvironmentBroadcaster;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.Cell;
import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Food;
import com.hellengi.biolab.simulation.factory.SpawnFactory;
import com.hellengi.biolab.simulation.lifecycle.CellDivider;
import com.hellengi.biolab.simulation.mapper.EnvironmentMapper;
import com.hellengi.biolab.simulation.physics.CellCollision;
import com.hellengi.biolab.simulation.physics.WorldPhysics;
import com.hellengi.biolab.simulation.settings.RuntimeOverrides;
import com.hellengi.biolab.simulation.world.FoodSpawner;
import com.hellengi.biolab.simulation.world.WorldState;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SimulationLoop {
    private static final long SCHEDULER_POLL_INTERVAL_MS = 1L;
    private static final long MAX_STEPS_PER_POLL = 100L;
    private static final long NANOS_PER_MILLISECOND = 1_000_000L;
    private long lastBroadcastTimeMs = 0L;

    private long ticksProcessedInWindow = 0L;
    private long measuredTps = 0L;
    private long tpsWindowStartNs = System.nanoTime();

    private final YamlConfig baseConfig;
    private final RuntimeOverrides runtimeConfig;
    private final WorldState world;
    private final EnvironmentMapper environmentMapper;
    private final EnvironmentBroadcaster environmentBroadcaster;
    private final CellCollision cellCollision;
    private final RenderMetrics renderMetrics;
    private final WorldPhysics worldPhysics;
    private final CellDivider cellDivider;
    private final SpawnFactory spawnFactory;
    private final FoodSpawner foodSpawner;

    @Scheduled(fixedRate = SCHEDULER_POLL_INTERVAL_MS)
    public void simulationTick() {
        EnvironmentDto snapshot = null;

        synchronized (world) {
            if (runtimeConfig.getSpeedFactor() > 0.0) {
                performDueSimulationSteps();
            } else {
                resetSimulationClock();
            }

            if (isBroadcastDue()) {
                snapshot = environmentMapper.toDto(
                        world,
                        runtimeConfig.getDeadCellLifetimeTicks(),
                        measuredTps
                );
            }
        }

        if (snapshot != null) {
            environmentBroadcaster.broadcast(snapshot);
        }
    }

    private void performDueSimulationSteps() {
        long nowNs = System.nanoTime();

        double speedFactor = runtimeConfig.getSpeedFactor();
        if (speedFactor <= 0.0) {
            world.setLastSimulationStepTimeNs(nowNs);
            return;
        }

        long intervalNs = calculateTickIntervalNs(speedFactor);
        long elapsedNs = nowNs - world.getLastSimulationStepTimeNs();

        if (elapsedNs < intervalNs) {
            return;
        }

        long steps = Math.max(1L, elapsedNs / intervalNs);
        steps = Math.min(steps, MAX_STEPS_PER_POLL);

        double tickScale = calculateTickScale(speedFactor);
        for (long i = 0; i < steps; i++) {
            performSimulationStep(tickScale);
        }

        world.setLastSimulationStepTimeNs(
                world.getLastSimulationStepTimeNs() + steps * intervalNs
        );
    }

    private void performSimulationStep(double tickScale) {
        world.incrementTick();
        recordProcessedTick();
        resolveMotionAndCollisions(tickScale);
        updateCells(tickScale);
        updateDeadCells(tickScale);
        cleanupFoods();
        foodSpawner.spawnPeriodicFood(world, tickScale);
    }

    private void recordProcessedTick() {
        ticksProcessedInWindow++;

        long nowNs = System.nanoTime();
        long elapsedNs = nowNs - tpsWindowStartNs;

        if (elapsedNs >= 1_000_000_000L) {
            measuredTps = Math.round(ticksProcessedInWindow * 1_000_000_000.0 / elapsedNs);
            ticksProcessedInWindow = 0L;
            tpsWindowStartNs = nowNs;
        }
    }

    private long calculateTickIntervalNs(double speedFactor) {
        if (speedFactor < 1.0 && baseConfig.getTime().isScaleSlowdownInsideTick()) {
            return baseConfig.getTickRateMs() * NANOS_PER_MILLISECOND;
        }

        if (speedFactor > 1.0 && baseConfig.getTime().isScaleSpeedupInsideTick()) {
            return baseConfig.getTickRateMs() * NANOS_PER_MILLISECOND;
        }

        return Math.max(1L, Math.round(baseConfig.getTickRateMs() * NANOS_PER_MILLISECOND / speedFactor));
    }

    private double calculateTickScale(double speedFactor) {
        if (speedFactor < 1.0 && baseConfig.getTime().isScaleSlowdownInsideTick()) {
            return speedFactor;
        }

        if (speedFactor > 1.0 && baseConfig.getTime().isScaleSpeedupInsideTick()) {
            return speedFactor;
        }

        return 1.0;
    }

    private void resetSimulationClock() {
        world.setLastSimulationStepTimeNs(System.nanoTime());
    }

    private boolean isBroadcastDue() {
        long now = System.currentTimeMillis();

        int fps = Math.max(1, baseConfig.getBroadcast().getFps());
        long interval = Math.max(1L, Math.round(1000.0 / fps));

        if (now - lastBroadcastTimeMs < interval) {
            return false;
        }

        lastBroadcastTimeMs = now;
        return true;
    }

    private void resolveMotionAndCollisions(double tickScale) {
        int substeps = calculateCollisionSubsteps(tickScale);
        double stepScale = tickScale / substeps;

        for (int i = 0; i < substeps; i++) {
            moveAllParticles(stepScale);
            cellCollision.resolveAll(world.getCells(), world.getDeadCells());
            keepAllParticlesInside();
        }
    }

    private int calculateCollisionSubsteps(double tickScale) {
        double maxSpeed = 0.0;

        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) continue;
            maxSpeed = Math.max(maxSpeed, speed(cell.getVx(), cell.getVy()) * tickScale);
        }

        for (DeadCell deadCell : world.getDeadCells()) {
            maxSpeed = Math.max(maxSpeed, speed(deadCell.getVx(), deadCell.getVy()) * tickScale);
        }

        double maxStepDistance = Math.max(1.0, baseConfig.getPhysics().getMaxCollisionStepDistance());
        int maxSubsteps = Math.max(1, baseConfig.getPhysics().getMaxCollisionSubsteps());

        int requiredSubsteps = (int) Math.ceil(maxSpeed / maxStepDistance);
        return Math.max(1, Math.min(maxSubsteps, requiredSubsteps));
    }

    private double speed(double vx, double vy) {
        return Math.sqrt(vx * vx + vy * vy);
    }

    private void keepAllParticlesInside() {
        for (Cell cell : world.getCells()) {
            if (!cell.isMarkedForRemoval()) {
                worldPhysics.keepInside(cell, cellRadius(cell));
            }
        }

        for (DeadCell deadCell : world.getDeadCells()) {
            worldPhysics.keepInside(deadCell, deadCellRadius(deadCell));
        }
    }

    private void moveAllParticles(double stepScale) {
        for (Cell cell : world.getCells()) {
            if (!cell.isMarkedForRemoval()) {
                worldPhysics.move(cell, cellRadius(cell), stepScale);
            }
        }

        for (DeadCell deadCell : world.getDeadCells()) {
            worldPhysics.move(deadCell, deadCellRadius(deadCell), stepScale);
        }
    }

    private void updateCells(double tickScale) {
        List<Cell> newborns = new ArrayList<>();
        List<DeadCell> newDeadCells = new ArrayList<>();

        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) continue;

            worldPhysics.applyViscosity(cell, tickScale);

            cell.setEnergy(
                    cell.getEnergy() - baseConfig.getCell().getEnergyDecay() * tickScale
            );

            consumeFoodIfPossible(cell);

            if (cell.getEnergy() <= baseConfig.getCell().getMinEnergy()) {
                cell.setMarkedForRemoval(true);
                newDeadCells.add(spawnFactory.createDeadCellFromCell(cell));
                continue;
            }

            if (cell.getEnergy() >= cell.getGenome().getDivisionThreshold()) {
                List<Cell> children = cellDivider.divide(cell);
                if (!children.isEmpty()) {
                    newborns.addAll(children);
                    cell.setMarkedForRemoval(true);
                }
            }
        }

        world.getCells().addAll(newborns);
        world.getDeadCells().addAll(newDeadCells);
        world.getCells().removeIf(Cell::isMarkedForRemoval);
    }

    private void consumeFoodIfPossible(Cell cell) {
        for (Food food : world.getFoods()) {
            if (food.isConsumed()) continue;

            double dx = cell.getX() - food.getX();
            double dy = cell.getY() - food.getY();
            double distanceSquared = dx * dx + dy * dy;
            double consumptionRadius = baseConfig.getFood().getConsumptionRadius();

            if (distanceSquared > consumptionRadius * consumptionRadius) continue;

            double currentEnergy = cell.getEnergy();
            double maxEnergy = cell.getGenome().getMaxEnergy();
            double energyDeficit = maxEnergy - currentEnergy;

            if (energyDeficit <= 0.0) continue;

            double foodEnergy = food.getEnergy();
            if (foodEnergy <= energyDeficit) {
                cell.setEnergy(currentEnergy + foodEnergy);
                food.setConsumed(true);
            } else {
                cell.setEnergy(maxEnergy);
                food.setEnergy(foodEnergy - energyDeficit);
            }
        }
    }

    private void updateDeadCells(double tickScale) {
        List<Food> foodsFromDeadCells = new ArrayList<>();
        Iterator<DeadCell> iterator = world.getDeadCells().iterator();

        while (iterator.hasNext()) {
            DeadCell deadCell = iterator.next();

            worldPhysics.applyViscosity(deadCell, tickScale);
            deadCell.addLifetimeTicks(tickScale);

            if (deadCell.getLifetimeTicks() >= runtimeConfig.getDeadCellLifetimeTicks()) {
                foodsFromDeadCells.add(
                        spawnFactory.createFoodAtPosition(
                                deadCell.getX(),
                                deadCell.getY(),
                                deadCell.getEnergy()
                        )
                );
                iterator.remove();
            }
        }

        world.getFoods().addAll(foodsFromDeadCells);
    }

    private double cellRadius(Cell cell) {
        return renderMetrics.calculateCellRadius(
                cell.getEnergy(), cell.getGenome().getDivisionThreshold());
    }

    private double deadCellRadius(DeadCell deadCell) {
        return renderMetrics.calculateDeadCellRadius(deadCell.getEnergy());
    }

    private void cleanupFoods() {
        world.getFoods().removeIf(Food::isConsumed);
    }
}