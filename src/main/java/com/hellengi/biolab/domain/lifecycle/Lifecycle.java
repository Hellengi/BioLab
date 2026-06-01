package com.hellengi.biolab.domain.lifecycle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.Food;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import com.hellengi.biolab.domain.spawn.FoodFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import static com.hellengi.biolab.util.Utils.*;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class Lifecycle {
    private final YamlConfig baseConfig;
    private final RuntimeOverrides runtimeConfig;
    private final LifecycleDivider lifecycleDivider;
    private final LifecycleKiller lifecycleKiller;
    private final FoodFactory foodFactory;

    public void process(SimulationWorld world, double tickScale) {
        List<Cell> newborns = new ArrayList<>();
        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) continue;
            if (cell.isAlive()) {
                updateLivingCell(world, cell, tickScale, newborns);
            } else {
                updateDeadCell(world, cell, tickScale);
            }
        }
        newborns.forEach(world::addCell);
    }

    private void updateLivingCell(SimulationWorld world, Cell cell, double tickScale, List<Cell> newborns) {
        updateDirectionFromVelocity(cell);
        cell.setEnergy(cell.getEnergy() - baseConfig.getCell().getEnergyDecayPerTick() * tickScale);
        consumeFoodIfPossible(world, cell);

        if (cell.getEnergy() <= baseConfig.getCell().getDeathEnergy()) {
            lifecycleKiller.killCell(cell);
            return;
        }
        if (cell.getEnergy() < cell.getGenome().getDivisionThreshold()) {
            return;
        }

        List<Cell> children = lifecycleDivider.divide(cell);
        if (!children.isEmpty()) {
            newborns.addAll(children);
            cell.setMarkedForRemoval(true);
        }
    }

    private void updateDeadCell(SimulationWorld world, Cell cell, double tickScale) {
        cell.addLifetimeTicks(tickScale);
        if (cell.getLifetimeTicks() < runtimeConfig.getDeadCellLifetimeTicks()) {
            return;
        }
        world.addFood(foodFactory.createFoodAtPosition(cell.getX(), cell.getY(), cell.getEnergy()));
        cell.setMarkedForRemoval(true);
    }

    private void consumeFoodIfPossible(SimulationWorld world, Cell cell) {
        for (Food food : world.getFoods()) {
            if (food.isMarkedForRemoval()) {
                continue;
            }
            double dx = cell.getX() - food.getX();
            double dy = cell.getY() - food.getY();
            double consumptionRadius = baseConfig.getFood().getConsumptionRadius();
            if (dx * dx + dy * dy > consumptionRadius * consumptionRadius) {
                continue;
            }
            double energyDeficit = cell.getGenome().getMaxEnergy() - cell.getEnergy();
            if (energyDeficit <= 0.0) {
                continue;
            }
            if (food.getEnergy() <= energyDeficit) {
                cell.setEnergy(cell.getEnergy() + food.getEnergy());
                food.setMarkedForRemoval(true);
            } else {
                cell.setEnergy(cell.getGenome().getMaxEnergy());
                food.setEnergy(food.getEnergy() - energyDeficit);
            }
        }
    }

    private void updateDirectionFromVelocity(Cell cell) {
        cell.setDirectionAngle(wrapDegrees(
                Math.toDegrees(Math.atan2(cell.getVy(), cell.getVx())) + 90.0
        ));
    }
}
