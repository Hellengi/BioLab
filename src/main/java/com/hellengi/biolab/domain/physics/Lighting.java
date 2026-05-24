package com.hellengi.biolab.domain.physics;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.LightSource;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import com.hellengi.biolab.util.SliderScale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Lighting calculator and source factory.
 *
 * It reads world state to calculate irradiance but never commits changes.
 * SimulationEngine owns that responsibility through its processors.
 */
@Service
@RequiredArgsConstructor
public class Lighting {
    private final YamlConfig config;
    private final RuntimeOverrides runtimeConfig;
    private final SimulationWorld world;

    public double configuredGlobalLight(double globalLightCycleElapsedTicks) {
        return runtimeConfig.getGlobalLight(globalLightCycleElapsedTicks);
    }

    public int configuredSourceCount() {
        return runtimeConfig.getLightSourceCount();
    }

    public int configuredStartAngle() {
        return runtimeConfig.getLightSourceStartAngle();
    }

    public double configuredStartAngleRadians() {
        return Math.toRadians(configuredStartAngle() - 90.0);
    }

    public double configuredBrightness() {
        return runtimeConfig.getLightSourceBrightness();
    }

    public double configuredOrbitRadius() {
        return SliderScale.linear(
                runtimeConfig.getLightSourceOrbitRadius(),
                0.0,
                config.worldRadius()
        );
    }

    public double configuredOrbitSpeed() {
        return runtimeConfig.getLightSourceOrbitSpeed()
                / 100.0
                * config.getLight().getOrbitSpeedMaxRadiansPerTick();
    }

    public LightSource createConfiguredSource() {
        return new LightSource(
                configuredOrbitRadius(),
                configuredOrbitSpeed(),
                configuredBrightness(),
                0.0
        );
    }

    public double computeLocalLight(double x, double y) {
        double accumulated = world.getGlobalLight();

        double centerX = config.worldCenterX();
        double centerY = config.worldCenterY();
        double r0 = Math.max(1.0, config.getLight().getFalloffFactor());

        for (LightSource source : world.getLightSources()) {
            double sx = source.currentX(centerX);
            double sy = source.currentY(centerY);
            double dx = x - sx;
            double dy = y - sy;
            double distanceSquared = dx * dx + dy * dy;
            double distance = Math.sqrt(distanceSquared);
            double sourceRadiusSquared = r0 * r0;

            double turbidityAttenuation = Math.exp(
                    -runtimeConfig.getTurbidityAttenuation() * distance
            );

            double sourceLight = source.getBrightness()
                    * sourceRadiusSquared
                    / (distanceSquared + sourceRadiusSquared)
                    * turbidityAttenuation;

            accumulated += sourceLight;
        }

        return Math.max(0.0, accumulated);
    }

    public double[] buildLightMap(int width, int height, int gridStep) {
        int cols = (int) Math.ceil(width / (double) gridStep);
        int rows = (int) Math.ceil(height / (double) gridStep);
        double[] map = new double[cols * rows];

        for (int row = 0; row < rows; row++) {
            double y = (row + 0.5) * gridStep;

            for (int col = 0; col < cols; col++) {
                double x = (col + 0.5) * gridStep;
                map[row * cols + col] = computeLocalLight(x, y);
            }
        }

        return map;
    }
}
