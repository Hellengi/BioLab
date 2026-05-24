package com.hellengi.biolab.domain.spawn;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Food;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import com.hellengi.biolab.util.SliderScale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Random;

/** Stateless factory used by engine-owned simulation stages. */
@Component
@RequiredArgsConstructor
public class FoodFactory {
    private final YamlConfig config;
    private final RuntimeOverrides runtimeConfig;
    private final Random random = new Random();

    public double currentSpawnsPerTick() {
        return SliderScale.exponential(
                runtimeConfig.getFoodSpawnIntensity(),
                config.getFood().getMaxSpawnMultiplier()
        ) / 10;
    }

    public Food createRandomFood() {
        double angle = random.nextDouble() * Math.PI * 2.0;
        double distance = Math.sqrt(random.nextDouble()) * config.worldRadius();

        double x = config.worldCenterX() + Math.cos(angle) * distance;
        double y = config.worldCenterY() + Math.sin(angle) * distance;
        double energy = config.getFood().getMinEnergy()
                + random.nextDouble() * (config.getFood().getMaxEnergy() - config.getFood().getMinEnergy());

        return createFoodAtPosition(x, y, energy);
    }

    public Food createFoodAtPosition(double x, double y, double energy) {
        Food food = new Food(config);
        food.setPosition(x, y);
        food.setEnergy(Math.max(config.getFood().getMinEnergy(), energy));
        return food;
    }
}
