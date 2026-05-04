package com.hellengi.biolab.simulation;

import com.hellengi.biolab.api.dto.EnvironmentDto;
import com.hellengi.biolab.api.websocket.EnvironmentBroadcaster;
import com.hellengi.biolab.config.SimulationProperties;
import com.hellengi.biolab.model.Cell;
import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Food;
import com.hellengi.biolab.simulation.factory.EntityFactory;
import com.hellengi.biolab.simulation.lifecycle.CellDivisionService;
import com.hellengi.biolab.simulation.physics.WorldPhysics;
import com.hellengi.biolab.simulation.world.FoodSpawner;
import com.hellengi.biolab.simulation.world.SimulationEnvironment;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SimulationLoop {
    private static final long SCHEDULER_POLL_INTERVAL_MS = 10L;
    private static final long MAX_STEPS_PER_POLL = 10L;

    private final SimulationProperties baseConfig;
    private final SimulationRuntimeConfig runtimeConfig;
    private final SimulationEnvironment world;
    private final EnvironmentMapper environmentMapper;
    private final EnvironmentBroadcaster environmentBroadcaster;
    private final WorldPhysics worldPhysics;
    private final CellDivisionService cellDivisionService;
    private final EntityFactory entityFactory;
    private final FoodSpawner foodSpawner;

    @Scheduled(fixedRate = SCHEDULER_POLL_INTERVAL_MS)
    public void simulationTick() {
        EnvironmentDto snapshot;

        synchronized (world) {
            if (world.isRunning()) {
                performDueSimulationSteps();
            }

            snapshot = environmentMapper.toDto(
                    world,
                    runtimeConfig.getDeadCellLifetimeTicks()
            );
        }

        environmentBroadcaster.broadcast(snapshot);
    }

    private void performDueSimulationSteps() {
        long now = System.currentTimeMillis();
        long interval = baseConfig.getTickRateMs();
        long elapsed = now - world.getLastSimulationStepTimeMs();

        if (elapsed < interval) {
            return;
        }

        long steps = Math.max(1L, elapsed / interval);
        steps = Math.min(steps, MAX_STEPS_PER_POLL);

        for (long i = 0; i < steps; i++) {
            performSimulationStep();
        }

        world.setLastSimulationStepTimeMs(now);
    }

    private void performSimulationStep() {
        world.incrementTick();
        updateCells();
        updateDeadCells();
        cleanupFoods();
        foodSpawner.spawnPeriodicFood(world);
    }

    private void updateCells() {
        List<Cell> newborns = new ArrayList<>();
        List<DeadCell> newDeadCells = new ArrayList<>();

        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) {
                continue;
            }

            worldPhysics.move(cell);
            worldPhysics.applyViscosity(cell);

            cell.setEnergy(
                    cell.getEnergy() - baseConfig.getCell().getEnergyDecay()
            );

            consumeFoodIfPossible(cell);

            if (cell.getEnergy() <= baseConfig.getCell().getMinEnergy()) {
                cell.setMarkedForRemoval(true);
                newDeadCells.add(entityFactory.createDeadCellFromCell(cell));
                continue;
            }

            if (cell.getEnergy() >= cell.getGenome().getDivisionThreshold()) {
                List<Cell> children = cellDivisionService.divide(cell);

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
            if (food.isConsumed()) {
                continue;
            }

            double dx = cell.getX() - food.getX();
            double dy = cell.getY() - food.getY();
            double distanceSquared = dx * dx + dy * dy;
            double consumptionRadius = baseConfig.getFood().getConsumptionRadius();

            if (distanceSquared > consumptionRadius * consumptionRadius) {
                continue;
            }

            double currentEnergy = cell.getEnergy();
            double maxEnergy = cell.getGenome().getMaxEnergy();
            double energyDeficit = maxEnergy - currentEnergy;

            if (energyDeficit <= 0.0) {
                continue;
            }

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

    private void updateDeadCells() {
        List<Food> foodsFromDeadCells = new ArrayList<>();

        Iterator<DeadCell> iterator = world.getDeadCells().iterator();

        while (iterator.hasNext()) {
            DeadCell deadCell = iterator.next();

            worldPhysics.move(deadCell);
            worldPhysics.applyViscosity(deadCell);
            deadCell.incrementLifetimeTicks();

            if (deadCell.getLifetimeTicks() >= runtimeConfig.getDeadCellLifetimeTicks()) {
                foodsFromDeadCells.add(
                        entityFactory.createFoodAtPosition(
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

    private void cleanupFoods() {
        world.getFoods().removeIf(Food::isConsumed);
    }
}