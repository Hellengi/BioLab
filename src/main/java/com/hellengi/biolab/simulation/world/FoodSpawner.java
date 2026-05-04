package com.hellengi.biolab.simulation.world;

import com.hellengi.biolab.config.SimulationProperties;
import com.hellengi.biolab.simulation.SimulationRuntimeConfig;
import com.hellengi.biolab.simulation.factory.EntityFactory;
import com.hellengi.biolab.util.SliderScale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Random;

@Component
@RequiredArgsConstructor
public class FoodSpawner {
    private final SimulationProperties baseConfig;
    private final SimulationRuntimeConfig runtimeConfig;
    private final EntityFactory entityFactory;

    private final Random random = new Random();

    public void spawnPeriodicFood(SimulationEnvironment world) {
        double spawnsPerTick = currentFoodSpawnsPerTick();

        if (spawnsPerTick <= 0.0) {
            return;
        }

        int guaranteedSpawns = (int) Math.floor(spawnsPerTick);
        double fractionalPart = spawnsPerTick - guaranteedSpawns;

        for (int i = 0; i < guaranteedSpawns; i++) {
            world.getFoods().add(entityFactory.createRandomFood());
        }

        if (random.nextDouble() < fractionalPart) {
            world.getFoods().add(entityFactory.createRandomFood());
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