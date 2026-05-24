package com.hellengi.biolab.domain;

import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.Food;
import com.hellengi.biolab.domain.model.LightSource;
import lombok.Getter;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class SimulationWorld {
    private final List<Cell> cells = new ArrayList<>();
    private final List<Food> foods = new ArrayList<>();
    private final List<LightSource> lightSources = new ArrayList<>();

    @Getter
    private long tick = 0L;
    @Getter
    private double globalLight = 0.0;
    @Getter
    private double globalLightCycleElapsedTicks = 0.0;
    @Getter
    private double foodSpawnProgress = 0.0;

    public List<Cell> getCells() {
        return Collections.unmodifiableList(cells);
    }

    public List<Food> getFoods() {
        return Collections.unmodifiableList(foods);
    }

    public List<LightSource> getLightSources() {
        return Collections.unmodifiableList(lightSources);
    }

    void setTick(long tick) {
        this.tick = Math.max(0L, tick);
    }

    void incrementTick() {
        this.tick++;
    }

    void setGlobalLight(double globalLight) {
        this.globalLight = Math.max(0.0, globalLight);
    }

    void advanceGlobalLightCyclePhase(double tickScale) {
        this.globalLightCycleElapsedTicks += Math.max(0.0, tickScale);
    }

    void setGlobalLightCycleElapsedTicks(double phaseTicks) {
        this.globalLightCycleElapsedTicks = Math.max(0.0, phaseTicks);
    }

    void accumulateFoodSpawn(double amount) {
        this.foodSpawnProgress += Math.max(0.0, amount);
    }

    void consumeFoodSpawnProgress(int spawnedCount) {
        this.foodSpawnProgress = Math.max(0.0, foodSpawnProgress - Math.max(0, spawnedCount));
    }

    void setFoodSpawnProgress(double foodSpawnProgress) {
        this.foodSpawnProgress = Math.max(0.0, foodSpawnProgress);
    }

    void addCell(Cell cell) {
        cells.add(cell);
    }

    void removeMarkedCells() {
        cells.removeIf(Cell::isMarkedForRemoval);
    }

    void addFood(Food food) {
        foods.add(food);
    }

    void removeMarkedFoods() {
        foods.removeIf(Food::isMarkedForRemoval);
    }

    void addLightSource(LightSource lightSource) {
        lightSources.add(lightSource);
    }

    void clearLightSources() {
        lightSources.clear();
    }

    void removeLightSourcesFrom(int firstRemovedIndex) {
        int index = Math.max(0, Math.min(firstRemovedIndex, lightSources.size()));
        lightSources.subList(index, lightSources.size()).clear();
    }

    void clear() {
        cells.clear();
        foods.clear();
        lightSources.clear();
        tick = 0L;
        globalLight = 0.0;
        globalLightCycleElapsedTicks = 0.0;
        foodSpawnProgress = 0.0;
    }
}
