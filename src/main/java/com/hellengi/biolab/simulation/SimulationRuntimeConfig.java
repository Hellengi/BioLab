package com.hellengi.biolab.simulation;

import com.hellengi.biolab.config.SimulationProperties;
import com.hellengi.biolab.api.dto.SimulationSettingsDto;
import org.springframework.stereotype.Component;

@Component
public class SimulationRuntimeConfig {
    private final SimulationProperties baseConfig;

    private Integer initialCellCount;
    private Integer foodSpawnIntensity;
    private Long deadCellLifetimeTicks;

    public SimulationRuntimeConfig(SimulationProperties baseConfig) {
        this.baseConfig = baseConfig;
    }

    public int getInitialCellCount() {
        return initialCellCount != null
                ? initialCellCount
                : baseConfig.getCell().getInitialCount();
    }

    public int getFoodSpawnIntensity() {
        return foodSpawnIntensity != null
                ? foodSpawnIntensity
                : baseConfig.getFood().getSpawnIntensity();
    }

    public long getDeadCellLifetimeTicks() {
        return deadCellLifetimeTicks != null
                ? deadCellLifetimeTicks
                : baseConfig.getCell().getDeadLifetimeTicks();
    }

    public void update(int initialCellCount, int foodSpawnIntensity, long deadCellLifetimeTicks) {
        this.initialCellCount = Math.max(0, initialCellCount);
        this.foodSpawnIntensity = Math.max(0, foodSpawnIntensity);
        this.deadCellLifetimeTicks = Math.max(1L, deadCellLifetimeTicks);
    }

    public void reset() {
        this.initialCellCount = null;
        this.foodSpawnIntensity = null;
        this.deadCellLifetimeTicks = null;
    }

    public void loadFromConfig(SimulationSettingsDto configDto) {
        this.initialCellCount = Math.max(0, configDto.initialCellCount());
        this.foodSpawnIntensity = Math.max(0, configDto.foodSpawnIntensity());
        this.deadCellLifetimeTicks = Math.max(1L, configDto.deadCellLifetimeTicks());
    }
}