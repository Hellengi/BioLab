package com.hellengi.biolab.domain;

import com.hellengi.biolab.domain.spawn.FoodFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Runs periodic food spawning as an engine stage and owns its accumulator update. */
@Component
@RequiredArgsConstructor
final class FoodSpawnProcessor {
    private final FoodFactory foodFactory;

    void process(SimulationWorld world, double tickScale) {
        double spawnsPerTick = foodFactory.currentSpawnsPerTick();
        if (spawnsPerTick <= 0.0 || tickScale <= 0.0) {
            return;
        }

        world.accumulateFoodSpawn(spawnsPerTick * tickScale);
        int spawnCount = (int) Math.floor(world.getFoodSpawnProgress());
        if (spawnCount <= 0) {
            return;
        }

        world.consumeFoodSpawnProgress(spawnCount);
        for (int i = 0; i < spawnCount; i++) {
            world.addFood(foodFactory.createRandomFood());
        }
    }
}
