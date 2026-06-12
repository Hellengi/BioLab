package com.hellengi.biolab.domain;

import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.Food;
import com.hellengi.biolab.domain.model.GlobalLight;
import com.hellengi.biolab.domain.model.LightSource;
import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class SimulationWorld {
    private final List<Cell> cells = new ArrayList<>();
    private final List<Food> foods = new ArrayList<>();
    private final List<LightSource> lightSources = new ArrayList<>();
    private final List<Cell> cellsView = Collections.unmodifiableList(cells);
    private final List<Food> foodsView = Collections.unmodifiableList(foods);
    private final List<LightSource> lightSourcesView = Collections.unmodifiableList(lightSources);
    @Getter
    private final GlobalLight globalLight = new GlobalLight();

    @Getter @Setter
    private long tick = 0L;
    @Getter @Setter
    private double time = 0.0;
    @Getter @Setter
    private double foodSpawnBudget = 0.0;

    public List<Cell> getCells() {
        return cellsView;
    }

    public List<Food> getFoods() {
        return foodsView;
    }

    public List<LightSource> getLightSources() {
        return lightSourcesView;
    }

    public void incrementTick(double sec) {
        this.tick++;
        this.time += sec;
    }

    public void addFoodSpawnBudget(double amount) {
        this.foodSpawnBudget += amount;
    }

    public void spendFoodSpawnBudget(int spawnedCount) {
        this.foodSpawnBudget -= spawnedCount;
    }

    public void addCell(Cell cell) {
        cells.add(cell);
    }

    public void removeMarkedCells() {
        cells.removeIf(Cell::isMarkedForRemoval);
    }

    public void assignMissingCellEventTimes() {
        for (Cell cell : cells) {
            cell.assignMissingEventTimes(time);
        }
    }

    public void removeExpiredCellEvents() {
        for (Cell cell : cells) {
            cell.removeExpiredEvents(time);
        }
    }

    public void addFood(Food food) {
        foods.add(food);
    }

    public void removeMarkedFoods() {
        foods.removeIf(Food::isMarkedForRemoval);
    }

    public void addLightSource(LightSource lightSource) {
        lightSources.add(lightSource);
    }

    public void removeLightSource() {
        lightSources.removeLast();
    }

    public void clearLightSources() {
        lightSources.clear();
    }

    public void clear() {
        cells.clear();
        foods.clear();
        lightSources.clear();
        tick = 0L;
        time = 0.0;
        globalLight.clear();
        foodSpawnBudget = 0.0;
    }
}
