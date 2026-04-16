package com.hellengi.biolab.service;

import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Food;
import com.hellengi.biolab.model.Saprotroph;

import java.util.ArrayList;
import java.util.List;

public class SimulationWorld {

    private final List<Saprotroph> saprotrophs = new ArrayList<>();
    private final List<DeadCell> deadCells = new ArrayList<>();
    private final List<Food> foods = new ArrayList<>();

    private boolean running = false;
    private long tick = 0L;
    private long lastSimulationStepTimeMs = System.currentTimeMillis();

    public List<Saprotroph> getSaprotrophs() {
        return saprotrophs;
    }

    public List<DeadCell> getDeadCells() {
        return deadCells;
    }

    public List<Food> getFoods() {
        return foods;
    }

    public boolean isRunning() {
        return running;
    }

    public void setRunning(boolean running) {
        this.running = running;
    }

    public long getTick() {
        return tick;
    }

    public void setTick(long tick) {
        this.tick = tick;
    }

    public void incrementTick() {
        this.tick++;
    }

    public long getLastSimulationStepTimeMs() {
        return lastSimulationStepTimeMs;
    }

    public void setLastSimulationStepTimeMs(long lastSimulationStepTimeMs) {
        this.lastSimulationStepTimeMs = lastSimulationStepTimeMs;
    }

    public void clear() {
        saprotrophs.clear();
        deadCells.clear();
        foods.clear();
    }
}