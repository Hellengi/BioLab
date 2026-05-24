package com.hellengi.biolab.domain;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.Food;
import com.hellengi.biolab.domain.lifecycle.Divider;
import com.hellengi.biolab.domain.lifecycle.Killer;
import com.hellengi.biolab.domain.physics.Forces;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import com.hellengi.biolab.domain.spawn.FoodFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/** Runs lifecycle mutations as one engine stage, including its resulting births and decay-food. */
@Component
@RequiredArgsConstructor
final class CellLifecycleProcessor {
    private final YamlConfig baseConfig;
    private final RuntimeOverrides runtimeConfig;
    private final Forces forces;
    private final Divider divider;
    private final Killer killer;
    private final FoodFactory foodFactory;

    void process(SimulationWorld world, double tickScale) {
        List<Cell> newborns = new ArrayList<>();
        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) {
                continue;
            }
            if (cell.isAlive()) {
                updateLivingCell(world, cell, tickScale, newborns);
            } else {
                processDeadCell(world, cell, tickScale);
            }
        }
        newborns.forEach(world::addCell);
    }

    private void updateLivingCell(SimulationWorld world, Cell cell, double tickScale, List<Cell> newborns) {
        forces.apply(cell, tickScale);
        forces.updateDirectionFromVelocity(cell);
        cell.setEnergy(cell.getEnergy() - baseConfig.getCell().getEnergyDecayPerTick() * tickScale);
        consumeFoodIfPossible(world, cell);

        if (cell.getEnergy() <= baseConfig.getCell().getDeathEnergy()) {
            killer.killCell(cell);
            return;
        }
        if (cell.getEnergy() < cell.getGenome().getDivisionThreshold()) {
            return;
        }

        List<Cell> children = divider.divide(cell);
        if (!children.isEmpty()) {
            newborns.addAll(children);
            cell.setMarkedForRemoval(true);
        }
    }

    private void processDeadCell(SimulationWorld world, Cell cell, double tickScale) {
        forces.apply(cell, tickScale);
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
}
