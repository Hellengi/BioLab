package com.hellengi.biolab.domain.lifecycle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.Food;
import com.hellengi.biolab.domain.physics.Lighting;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import com.hellengi.biolab.domain.spatial.Quadtree;
import com.hellengi.biolab.domain.spatial.SpatialBounds;
import com.hellengi.biolab.domain.spawn.FoodFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.hellengi.biolab.util.Utils.*;

@Component
@RequiredArgsConstructor
public class Lifecycle {
    private final YamlConfig baseConfig;
    private final RuntimeOverrides runtimeConfig;
    private final LifecycleDivider lifecycleDivider;
    private final LifecycleKiller lifecycleKiller;
    private final FoodFactory foodFactory;
    private final Lighting lighting;
    private final CellDamageRepair cellDamageRepair;
    private final FoodDigestion foodDigestion;

    public void process(SimulationWorld world, double tickScale) {
        List<Cell> newborns = new ArrayList<>();
        Quadtree<Food> foodIndex = buildFoodIndex(world);
        Map<Long, Food> foodById = foodById(world);
        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) continue;
            if (cell.isAlive()) {
                updateLivingCell(world, cell, tickScale, newborns, foodIndex, foodById);
            } else {
                updateDeadCell(world, cell, tickScale);
            }
        }
        newborns.forEach(world::addCell);
        foodDigestion.releaseOrphanedCapturedFood(world, cellById(world));
    }

    private void updateLivingCell(
            SimulationWorld world,
            Cell cell,
            double tickScale,
            List<Cell> newborns,
            Quadtree<Food> foodIndex,
            Map<Long, Food> foodById
    ) {
        foodDigestion.process(world, cell, foodIndex, foodById, tickScale);

        double irradiance = lighting.sampleMetabolicLightAt(cell.getX(), cell.getY());
        cellDamageRepair.process(cell, irradiance, tickScale);

        if (cell.isLethallyDamaged()) {
            foodDigestion.releaseCapturedFood(world, cell, true);
            lifecycleKiller.killCell(cell);
            return;
        }

        if (!cell.canDivide()) {
            return;
        }

        List<Cell> children = lifecycleDivider.divide(cell);
        if (!children.isEmpty()) {
            foodDigestion.transferCapturedFoodOnDivision(world, cell, children);
            newborns.addAll(children);
            cell.setMarkedForRemoval(true);
        }
    }

    private void updateDeadCell(SimulationWorld world, Cell cell, double tickScale) {
        cell.addLifetimeTicks(tickScale);
        if (cell.getLifetimeTicks() < runtimeConfig.getDeadCellLifetimeTicks()) {
            return;
        }
        foodFactory.scatterDeadCellFood(world, cell);
        cell.setMarkedForRemoval(true);
    }

    private Map<Long, Food> foodById(SimulationWorld world) {
        Map<Long, Food> byId = new HashMap<>();
        for (Food food : world.getFoods()) {
            if (!food.isMarkedForRemoval()) {
                byId.put(food.getId(), food);
            }
        }
        return byId;
    }

    private Map<Long, Cell> cellById(SimulationWorld world) {
        Map<Long, Cell> byId = new HashMap<>();
        for (Cell cell : world.getCells()) {
            if (!cell.isMarkedForRemoval()) {
                byId.put(cell.getId(), cell);
            }
        }
        return byId;
    }

    private Quadtree<Food> buildFoodIndex(SimulationWorld world) {
        Quadtree<Food> foodIndex = new Quadtree<>(worldBounds(), this::foodBounds);
        for (Food food : world.getFoods()) {
            if (!food.isMarkedForRemoval() && !food.isCaptured()) {
                foodIndex.insert(food);
            }
        }
        return foodIndex;
    }

    private SpatialBounds foodBounds(Food food) {
        return SpatialBounds.fromCenterAndRadius(food.getX(), food.getY(), 0.0);
    }

    private SpatialBounds worldBounds() {
        double margin = Math.max(32.0, baseConfig.getCell().getBaseRadius() + baseConfig.getFood().getBaseRadius() * 4.0);
        double diameter = baseConfig.getTubeDiameter();
        return SpatialBounds.fromMinMax(-margin, -margin, diameter + margin, diameter + margin);
    }

}
