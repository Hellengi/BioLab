package com.hellengi.biolab.domain.spawn;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Food;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import com.hellengi.biolab.dto.FoodDto;
import com.hellengi.biolab.dto.domain_mapper.FoodMapper;
import com.hellengi.biolab.util.SliderScale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Random;

@Component
@RequiredArgsConstructor
public class FoodFactory {
    private final YamlConfig baseConfig;
    private final RuntimeOverrides runtimeConfig;
    private final FoodMapper foodMapper;
    private final Random random = new Random();

    public void process(SimulationWorld world, double tickScale) {
        double spawnsPerTick = currentSpawnsPerTick();
        if (spawnsPerTick <= 0.0 || tickScale <= 0.0) {
            return;
        }

        world.addFoodSpawnBudget(spawnsPerTick * tickScale);
        int spawnCount = (int) Math.floor(world.getFoodSpawnBudget());
        if (spawnCount <= 0) {
            return;
        }

        world.spendFoodSpawnBudget(spawnCount);
        for (int i = 0; i < spawnCount; i++) {
            world.addFood(createRandomFood());
        }
    }

    public void fill(SimulationWorld world, int amount) {
        for (int i = 0; i < amount; i++) {
            world.addFood(createRandomFood());
        }
    }

    public void loadSnapshot(SimulationWorld world, List<FoodDto> foods) {
        if (foods != null) {
            for (FoodDto dto : foods) {
                world.addFood(foodMapper.toDomain(dto));
            }
        }
    }

    public double currentSpawnsPerTick() {
        return SliderScale.exponential(
                runtimeConfig.getFoodSpawnIntensity(),
                baseConfig.getFood().getMaxSpawnMultiplier()
        ) / 10;
    }

    public Food createRandomFood() {
        double angle = random.nextDouble() * Math.PI * 2.0;
        double distance = Math.sqrt(random.nextDouble()) * baseConfig.worldRadius();

        double x = baseConfig.worldCenterX() + Math.cos(angle) * distance;
        double y = baseConfig.worldCenterY() + Math.sin(angle) * distance;
        double energy = baseConfig.getFood().getMinEnergy()
                + random.nextDouble() * (baseConfig.getFood().getMaxEnergy() - baseConfig.getFood().getMinEnergy());

        return createFoodAtPosition(x, y, energy);
    }

    public Food createFoodAtPosition(double x, double y, double energy) {
        Food food = new Food(baseConfig);
        food.setPosition(x, y);
        food.setEnergy(Math.max(baseConfig.getFood().getMinEnergy(), energy));
        return food;
    }
}
