package com.hellengi.biolab.simulation.world;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.simulation.settings.RuntimeOverrides;
import com.hellengi.biolab.simulation.factory.SpawnFactory;
import com.hellengi.biolab.util.SliderScale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FoodSpawner {
    private final YamlConfig baseConfig;
    private final RuntimeOverrides runtimeConfig;
    private final SpawnFactory spawnFactory;

    private double foodSpawnProgress = 0.0;

    public void spawnPeriodicFood(WorldState world, double tickScale) {
        double spawnsPerTick = currentFoodSpawnsPerTick();

        if (spawnsPerTick <= 0.0 || tickScale <= 0.0) {
            return;
        }

        foodSpawnProgress += spawnsPerTick * tickScale;

        int spawnsToCreate = (int) Math.floor(foodSpawnProgress);
        if (spawnsToCreate <= 0) {
            return;
        }

        foodSpawnProgress -= spawnsToCreate;

        for (int i = 0; i < spawnsToCreate; i++) {
            world.getFoods().add(spawnFactory.createRandomFood());
        }
    }

    private double currentFoodSpawnsPerTick() {
        return currentFoodGenerationFrequencyMultiplier() / 10.0;
    }

    private double currentFoodGenerationFrequencyMultiplier() {
        return SliderScale.exponential(
                runtimeConfig.getFoodSpawnIntensity(),
                baseConfig.getFood().getSpawnMaxMultiplier()
        );
    }
}