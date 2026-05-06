package com.hellengi.biolab.simulation.settings;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.api.dto.SimulationSettingsDto;
import org.springframework.stereotype.Component;

@Component
public class RuntimeOverrides {
    private final YamlConfig baseConfig;

    private Double timeSlider;
    private Boolean paused;
    private Integer initialCellCount;
    private Integer foodSpawnIntensity;
    private Long deadCellLifetimeTicks;

    public RuntimeOverrides(YamlConfig baseConfig) {
        this.baseConfig = baseConfig;
    }

    public double getTimeSlider() {
        return timeSlider != null ? timeSlider : 50.0;
    }

    public boolean isPaused() {
        return paused == null || paused;
    }

    public double getSpeedFactor() {
        if (isPaused()) return 0.0;

        return getSliderSpeedFactor();
    }

    public double getTemperatureCelsius() {
        double speed = getSliderSpeedFactor();

        double minSpeed = safeMinSpeed();
        double maxSpeed = safeMaxSpeed();

        double minTemperature = baseConfig.getTime().getMinTemperatureCelsius();
        double normalTemperature = baseConfig.getTime().getNormalTemperatureCelsius();
        double maxTemperature = baseConfig.getTime().getMaxTemperatureCelsius();

        if (speed <= 1.0) {
            double t = (speed - minSpeed) / (1.0 - minSpeed);

            return minTemperature
                    + t * (normalTemperature - minTemperature);
        }

        double t = (speed - 1.0) / (maxSpeed - 1.0);

        return normalTemperature
                + t * (maxTemperature - normalTemperature);
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

    public void update(int initialCellCount,
                       int foodSpawnIntensity,
                       long deadCellLifetimeTicks,
                       double timeSlider,
                       boolean paused) {
        this.initialCellCount = Math.max(0, initialCellCount);
        this.foodSpawnIntensity = Math.max(0, foodSpawnIntensity);
        this.deadCellLifetimeTicks = Math.max(1L, deadCellLifetimeTicks);
        this.timeSlider = Math.max(0.0, Math.min(100.0, timeSlider));
        this.paused = paused;
    }

    public void reset() {
        this.initialCellCount = null;
        this.foodSpawnIntensity = null;
        this.deadCellLifetimeTicks = null;
    }

    public void apply(SimulationSettingsDto configDto) {
        update(
                configDto.initialCellCount(),
                configDto.foodSpawnIntensity(),
                configDto.deadCellLifetimeTicks(),
                configDto.timeSlider(),
                configDto.paused()
        );
    }

    public void pause() {
        this.paused = true;
    }

    private double getSliderSpeedFactor() {
        double value = Math.max(0.0, Math.min(100.0, getTimeSlider()));

        if (value <= 50.0) {
            double t = value / 50.0;
            double minSpeed = safeMinSpeed();

            return minSpeed + t * (1.0 - minSpeed);
        }

        double t = (value - 50.0) / 50.0;
        double maxSpeed = safeMaxSpeed();

        return 1.0 + t + (maxSpeed - 2.0) * t * t;
    }

    private double safeMinSpeed() {
        return Math.max(0.0001, Math.min(1.0, baseConfig.getTime().getMinSpeedFactor()));
    }

    private double safeMaxSpeed() {
        return Math.max(1.0, baseConfig.getTime().getMaxSpeedFactor());
    }
}