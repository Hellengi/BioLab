package com.hellengi.biolab.domain.settings;

import com.hellengi.biolab.api.dto.RangedValueDto;
import com.hellengi.biolab.api.dto.SimulationSettingsDto;
import com.hellengi.biolab.config.YamlConfig;
import org.springframework.stereotype.Component;

@Component
public class RuntimeOverrides {
    private final YamlConfig baseConfig;

    private Double timeSlider;
    private Boolean paused;
    private Integer initialCellCount;
    private Integer foodSpawnIntensity;
    private Integer viscositySlider;
    private Integer turbiditySlider;
    private Integer gravitySlider;
    private Integer radiationSlider;
    private Double globalLight;
    private Boolean globalLightCycleEnabled;
    private Double globalLightCycleMin;
    private Double globalLightCyclePeriodSeconds;
    private Boolean localLightSourcesEnabled;
    private Integer lightSourceCount;
    private Integer lightSourceStartAngle;
    private Integer lightSourceBrightness;
    private Integer lightSourceOrbitRadius;
    private Integer lightSourceOrbitSpeed;

    public RuntimeOverrides(YamlConfig baseConfig) {
        this.baseConfig = baseConfig;
    }

    public double getTimeSlider() {
        return timeSlider != null
                ? timeSlider
                : baseConfig.getControls().getTime().getInitial();
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
            return minTemperature + t * (normalTemperature - minTemperature);
        }

        double t = (speed - 1.0) / (maxSpeed - 1.0);
        return normalTemperature + t * (maxTemperature - normalTemperature);
    }

    public int getInitialCellCount() {
        return initialCellCount != null
                ? initialCellCount
                : controlInitialInt(baseConfig.getCell().getStart());
    }

    public int getFoodSpawnIntensity() {
        return foodSpawnIntensity != null
                ? foodSpawnIntensity
                : controlInitialInt(baseConfig.getControls().getFoodSpawnIntensity());
    }

    public long getDeadCellLifetimeTicks() {
        return baseConfig.getCell().getDeadLifetimeTicks();
    }

    public int getViscositySlider() {
        return viscositySlider != null
                ? viscositySlider
                : controlInitialInt(baseConfig.getControls().getViscosity());
    }

    public double getViscosity() {
        double t = getViscositySlider() / 100.0;
        return baseConfig.getEnvironment().getMaxViscosity() * t * t;
    }

    public int getTurbiditySlider() {
        return turbiditySlider != null
                ? turbiditySlider
                : controlInitialInt(baseConfig.getControls().getTurbidity());
    }

    public double getTurbidityAttenuation() {
        double t = getTurbiditySlider() / 100.0;
        return baseConfig.getLight().getMaxTurbidityAttenuation() * t * t;
    }

    public int getGravitySlider() {
        return gravitySlider != null
                ? gravitySlider
                : controlInitialInt(baseConfig.getControls().getGravity());
    }

    public double getGravity() {
        double t = getGravitySlider() / 100.0;
        return baseConfig.getEnvironment().getMaxGravity() * t * t;
    }

    public int getRadiationSlider() {
        return radiationSlider != null
                ? radiationSlider
                : controlInitialInt(baseConfig.getControls().getRadiation());
    }

    public double getRadiationMutationChance() {
        double base = baseConfig.getEnvironment().getBaseMutationChance();
        double max = baseConfig.getEnvironment().getMaxMutationChance();
        double t = getRadiationSlider() / 100.0;
        return base + (max - base) * t * t;
    }

    public double getGlobalLight(double globalLightCycleElapsedTicks) {
        if (!isGlobalLightCycleEnabled()) {
            return getStaticGlobalLight();
        }

        double periodSeconds = getGlobalLightCyclePeriodSeconds();
        if (periodSeconds <= 0.0) {
            return getStaticGlobalLight();
        }

        double min = getGlobalLightCycleMin();
        double max = getStaticGlobalLight();

        double periodTicks = Math.max(
                1.0,
                periodSeconds * ticksPerSecond()
        );

        double phase = (Math.max(0.0, globalLightCycleElapsedTicks) % periodTicks) / periodTicks;
        double wave = (Math.sin(phase * Math.PI * 2.0 - Math.PI / 2.0) + 1.0) / 2.0;

        return min + (max - min) * wave;
    }

    private double ticksPerSecond() {
        return 1000.0 / Math.max(1.0, baseConfig.getTickRateMs());
    }

    public double getStaticGlobalLight() {
        return globalLight != null
                ? globalLight
                : controlInitialDouble(baseConfig.getControls().getGlobalLight()) / 100.0;
    }

    public boolean isGlobalLightCycleEnabled() {
        return globalLightCycleEnabled != null
                ? globalLightCycleEnabled
                : baseConfig.getLight().isGlobalCycleEnabled();
    }

    public double getGlobalLightCycleMin() {
        return globalLightCycleMin != null
                ? globalLightCycleMin
                : controlInitialDouble(baseConfig.getControls().getGlobalLightCycleMin()) / 100.0;
    }

    public double getGlobalLightCyclePeriodSeconds() {
        return globalLightCyclePeriodSeconds != null
                ? globalLightCyclePeriodSeconds
                : controlInitialDouble(baseConfig.getControls().getGlobalLightCyclePeriod());
    }

    public boolean isLocalLightSourcesEnabled() {
        return localLightSourcesEnabled != null
                ? localLightSourcesEnabled
                : baseConfig.getLight().isLocalSourcesEnabled();
    }

    public int getLightSourceCount() {
        if (!isLocalLightSourcesEnabled()) return 0;

        return lightSourceCount != null
                ? lightSourceCount
                : controlInitialInt(baseConfig.getControls().getLightSourceCount());
    }

    public int getLightSourceStartAngle() {
        return lightSourceStartAngle != null
                ? lightSourceStartAngle
                : controlInitialInt(baseConfig.getControls().getLightSourceStartAngle());
    }

    public double getLightSourceBrightness() {
        int slider = lightSourceBrightness != null
                ? lightSourceBrightness
                : controlInitialInt(baseConfig.getControls().getLightSourceBrightness());

        return slider / 100.0;
    }

    public int getLightSourceOrbitRadius() {
        return lightSourceOrbitRadius != null
                ? lightSourceOrbitRadius
                : controlInitialInt(baseConfig.getControls().getLightSourceOrbitRadius());
    }

    public int getLightSourceOrbitSpeed() {
        return lightSourceOrbitSpeed != null
                ? lightSourceOrbitSpeed
                : controlInitialInt(baseConfig.getControls().getLightSourceOrbitSpeed());
    }

    public void apply(SimulationSettingsDto dto) {
        if (dto == null) return;

        this.initialCellCount = controlInt(
                dto.initialCellCount(),
                baseConfig.getCell().getStart()
        );
        this.foodSpawnIntensity = controlInt(
                dto.foodSpawnIntensity(),
                baseConfig.getControls().getFoodSpawnIntensity()
        );
        this.timeSlider = controlDouble(
                dto.timeSlider(),
                baseConfig.getControls().getTime()
        );
        this.paused = dto.paused();

        this.viscositySlider = controlInt(
                dto.viscositySlider(),
                baseConfig.getControls().getViscosity()
        );
        this.turbiditySlider = controlInt(
                dto.turbiditySlider(),
                baseConfig.getControls().getTurbidity()
        );
        this.gravitySlider = controlInt(
                dto.gravitySlider(),
                baseConfig.getControls().getGravity()
        );
        this.radiationSlider = controlInt(
                dto.radiationSlider(),
                baseConfig.getControls().getRadiation()
        );

        this.globalLightCycleEnabled = dto.globalLightCycleEnabled();

        double max = clampUnit(
                controlValue(
                        dto.globalLightPercent(),
                        getStaticGlobalLight() * 100.0
                ) / 100.0
        );
        double min = clampUnit(
                controlValue(
                        dto.globalLightCycleMinPercent(),
                        getGlobalLightCycleMin() * 100.0
                ) / 100.0
        );

        this.globalLight = max;
        this.globalLightCycleMin = Math.min(min, max);
        this.globalLightCyclePeriodSeconds = controlDouble(
                dto.globalLightCyclePeriodSeconds(),
                baseConfig.getControls().getGlobalLightCyclePeriod()
        );

        this.localLightSourcesEnabled = dto.localLightSourcesEnabled();
        this.lightSourceCount = controlInt(
                dto.lightSourceCount(),
                baseConfig.getControls().getLightSourceCount()
        );
        this.lightSourceStartAngle = normalizeStartAngle(
                controlInt(dto.lightSourceStartAngle(), baseConfig.getControls().getLightSourceStartAngle())
        );
        this.lightSourceBrightness = controlInt(
                dto.lightSourceBrightness(),
                baseConfig.getControls().getLightSourceBrightness()
        );
        this.lightSourceOrbitRadius = controlInt(
                dto.lightSourceOrbitRadius(),
                baseConfig.getControls().getLightSourceOrbitRadius()
        );
        this.lightSourceOrbitSpeed = controlInt(
                dto.lightSourceOrbitSpeed(),
                baseConfig.getControls().getLightSourceOrbitSpeed()
        );
    }

    public void reset() {
        this.initialCellCount = null;
        this.foodSpawnIntensity = null;
        this.timeSlider = null;
        this.paused = null;
        this.viscositySlider = null;
        this.turbiditySlider = null;
        this.gravitySlider = null;
        this.radiationSlider = null;
        this.globalLight = null;
        this.globalLightCycleEnabled = null;
        this.globalLightCycleMin = null;
        this.globalLightCyclePeriodSeconds = null;
        this.localLightSourcesEnabled = null;
        this.lightSourceCount = null;
        this.lightSourceStartAngle = null;
        this.lightSourceBrightness = null;
        this.lightSourceOrbitRadius = null;
        this.lightSourceOrbitSpeed = null;
    }

    public void pause() {
        this.paused = true;
    }

    public void applySnapshot(SimulationSettingsDto dto) {
        apply(dto);
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

    private int normalizeStartAngle(int value) {
        YamlConfig.Control control = baseConfig.getControls().getLightSourceStartAngle();

        int min = (int) Math.round(control.getMin());
        int max = (int) Math.round(control.getMax());
        int step = Math.max(1, (int) Math.round(control.getStep()));

        int clamped = clampInt(value, min, max);
        return Math.round((clamped - min) / (float) step) * step + min;
    }

    private int controlInitialInt(YamlConfig.Control control) {
        return (int) Math.round(control.getInitial());
    }

    private double controlInitialDouble(YamlConfig.Control control) {
        return control.getInitial();
    }

    private double controlValue(RangedValueDto dto, double fallback) {
        return dto != null ? dto.value() : fallback;
    }

    private int controlInt(RangedValueDto dto, YamlConfig.Control control) {
        double value = controlValue(dto, control.getInitial());
        int min = (int) Math.round(control.getMin());
        int max = (int) Math.round(control.getMax());
        int step = Math.max(1, (int) Math.round(control.getStep()));

        int clamped = clampInt((int) Math.round(value), min, max);
        return Math.round((clamped - min) / (float) step) * step + min;
    }

    private double controlDouble(RangedValueDto dto, YamlConfig.Control control) {
        double value = controlValue(dto, control.getInitial());
        double clamped = clampDouble(value, control.getMin(), control.getMax());
        double step = control.getStep();

        if (step <= 0.0) {
            return clamped;
        }

        return Math.round((clamped - control.getMin()) / step) * step + control.getMin();
    }

    private int clampInt(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private double clampDouble(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private double safeMinSpeed() {
        return Math.max(0.0001, Math.min(1.0, baseConfig.getTime().getMinSpeedFactor()));
    }

    private double safeMaxSpeed() {
        return Math.max(1.0, baseConfig.getTime().getMaxSpeedFactor());
    }

    private double clampUnit(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }
}