package com.hellengi.biolab.domain.lifecycle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.Food;
import com.hellengi.biolab.domain.physics.Lighting;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import com.hellengi.biolab.domain.spatial.SpatialHashGrid;
import com.hellengi.biolab.domain.spawn.FoodFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


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

    private static final double MIN_FOOD_BUCKET_SIZE = 8.0;
    private static final double FOOD_BUCKET_RADIUS_FACTOR = 2.0;

    private final SpatialHashGrid<Food> foodIndex = new SpatialHashGrid<>(Food::getX, Food::getY);

    public void process(SimulationWorld world, double tickScale) {
        List<Cell> newborns = new ArrayList<>();
        buildFoodIndex(world);
        Map<Long, Food> foodById = foodById(world);
        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) continue;
            if (cell.isAlive()) {
                updateLivingCell(world, cell, tickScale, newborns, foodById);
            } else {
                updateDeadCell(world, cell, tickScale);
            }
        }
        newborns.forEach(world::addCell);
        if (hasCapturedFood(world)) {
            foodDigestion.releaseOrphanedCapturedFood(world, cellById(world));
        }
    }

    private void updateLivingCell(
            SimulationWorld world,
            Cell cell,
            double tickScale,
            List<Cell> newborns,
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
        Map<Long, Food> byId = new HashMap<>(hashCapacity(world.getFoods().size()));
        for (Food food : world.getFoods()) {
            if (!food.isMarkedForRemoval()) {
                byId.put(food.getId(), food);
            }
        }
        return byId;
    }

    private boolean hasCapturedFood(SimulationWorld world) {
        for (Food food : world.getFoods()) {
            if (food.isCaptured()) {
                return true;
            }
        }
        return false;
    }

    private Map<Long, Cell> cellById(SimulationWorld world) {
        Map<Long, Cell> byId = new HashMap<>(hashCapacity(world.getCells().size()));
        for (Cell cell : world.getCells()) {
            if (!cell.isMarkedForRemoval()) {
                byId.put(cell.getId(), cell);
            }
        }
        return byId;
    }

    private int hashCapacity(int expectedSize) {
        return Math.max(16, (int) (expectedSize / 0.75f) + 1);
    }

    private void buildFoodIndex(SimulationWorld world) {
        foodIndex.rebuild(
                world.getFoods(),
                foodBucketSize(),
                food -> !food.isMarkedForRemoval() && !food.isCaptured()
        );
    }

    private double foodBucketSize() {
        double maxFoodRadius = baseConfig.getFood().getBaseRadius()
                * Math.sqrt(Math.max(0.0, baseConfig.getFood().getMaxEnergy()) / Math.max(0.1, baseConfig.getFood().getMinEnergy()));
        double maxInteractionRadius = baseConfig.getCell().getBaseRadius() + maxFoodRadius;
        return Math.max(MIN_FOOD_BUCKET_SIZE, maxInteractionRadius * FOOD_BUCKET_RADIUS_FACTOR);
    }

}
