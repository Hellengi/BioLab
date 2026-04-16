package com.hellengi.biolab.service;

import com.hellengi.biolab.config.SimulationProperties;
import com.hellengi.biolab.dto.SimulationConfigDto;

public class SimulationRuntimeOverrides {

    private Integer initialSaprotrophCount;
    private Integer foodGenerationIntensity;
    private Long deadCellLifetimeTicks;

    public int getInitialSaprotrophCount(SimulationProperties baseConfig) {
        return initialSaprotrophCount != null
                ? initialSaprotrophCount
                : baseConfig.getInitialSaprotrophCount();
    }

    public int getFoodGenerationIntensity(SimulationProperties baseConfig) {
        return foodGenerationIntensity != null
                ? foodGenerationIntensity
                : baseConfig.getFoodGenerationIntensity();
    }

    public long getDeadCellLifetimeTicks(SimulationProperties baseConfig) {
        return deadCellLifetimeTicks != null
                ? deadCellLifetimeTicks
                : baseConfig.getDeadCellLifetimeTicks();
    }

    public void update(int initialSaprotrophCount, int foodGenerationIntensity, long deadCellLifetimeTicks) {
        this.initialSaprotrophCount = Math.max(0, initialSaprotrophCount);
        this.foodGenerationIntensity = Math.max(0, foodGenerationIntensity);
        this.deadCellLifetimeTicks = Math.max(1L, deadCellLifetimeTicks);
    }

    public void reset() {
        this.initialSaprotrophCount = null;
        foodGenerationIntensity = null;
        this.deadCellLifetimeTicks = null;
    }

    public void loadFromConfig(SimulationConfigDto configDto) {
        this.initialSaprotrophCount = Math.max(0, configDto.initialSaprotrophCount());
        this.foodGenerationIntensity = Math.max(0, configDto.foodGenerationIntensity());
        this.deadCellLifetimeTicks = Math.max(1L, configDto.deadCellLifetimeTicks());
    }
}