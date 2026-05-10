package com.hellengi.biolab.simulation.lighting;

import com.hellengi.biolab.api.dto.LightSourceDto;
import com.hellengi.biolab.api.dto.LightingDto;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.LightSource;
import com.hellengi.biolab.simulation.settings.RuntimeOverrides;
import com.hellengi.biolab.util.SliderScale;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LightingSystem {

    private final YamlConfig config;
    private final RuntimeOverrides runtimeConfig;

    @Getter
    private final List<LightSource> sources = new ArrayList<>();

    private Integer lastDistributedSourceCount = null;
    private Integer lastDistributedStartAngle = null;

    public void tick(double tickScale) {
        syncSourceCount();

        runtimeConfig.advanceGlobalLightCycle(tickScale);

        for (LightSource source : sources) {
            source.advanceAngle(tickScale);
        }
    }

    public double computeLocalLight(double x, double y) {
        double accumulated = runtimeConfig.getGlobalLight();

        double centerX = config.worldCenterX();
        double centerY = config.worldCenterY();
        double r0 = Math.max(1.0, config.getLight().getFalloffFactor());

        for (LightSource source : sources) {
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

    public void reset() {
        sources.clear();
        lastDistributedSourceCount = null;
        lastDistributedStartAngle = null;
        syncSourceCount();
    }

    public void syncSourceCount() {
        int target = runtimeConfig.getLightSourceCount();
        int current = sources.size();

        boolean countChanged = current != target;

        if (current < target) {
            for (int i = current; i < target; i++) {
                sources.add(createSource());
            }
        } else if (current > target) {
            sources.subList(target, current).clear();
        }

        syncSourceParams();

        int startAngle = runtimeConfig.getLightSourceStartAngle();
        if (countChanged
                || lastDistributedSourceCount == null
                || lastDistributedStartAngle == null
                || lastDistributedSourceCount != target
                || lastDistributedStartAngle != startAngle) {
            distributeSourceAngles();
            lastDistributedSourceCount = target;
            lastDistributedStartAngle = startAngle;
        }
    }

    public void loadSnapshot(LightingDto lighting) {
        sources.clear();

        if (lighting == null || lighting.sources() == null) {
            lastDistributedSourceCount = null;
            lastDistributedStartAngle = null;
            syncSourceCount();
            return;
        }

        for (LightSourceDto dto : lighting.sources()) {
            sources.add(new LightSource(
                    dto.orbitRadius(),
                    dto.orbitSpeed(),
                    dto.brightness(),
                    dto.angle()
            ));
        }

        lastDistributedSourceCount = sources.size();
        lastDistributedStartAngle = runtimeConfig.getLightSourceStartAngle();

        syncSourceParams();
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

    private void syncSourceParams() {
        double brightness  = runtimeConfig.getLightSourceBrightness();
        double orbitRadius = computeOrbitRadius();
        double orbitSpeed  = computeOrbitSpeed();

        for (LightSource source : sources) {
            source.setBrightness(brightness);
            source.setOrbitRadius(orbitRadius);
            source.setOrbitSpeed(orbitSpeed);
        }
    }

    private LightSource createSource() {
        return new LightSource(
                computeOrbitRadius(),
                computeOrbitSpeed(),
                runtimeConfig.getLightSourceBrightness(),
                0.0
        );
    }

    private double computeOrbitRadius() {
        double maxRadius = config.worldRadius();
        return SliderScale.linear(runtimeConfig.getLightSourceOrbitRadius(), 0.0, maxRadius);
    }

    private double computeOrbitSpeed() {
        return runtimeConfig.getLightSourceOrbitSpeed()
                / 100.0
                * config.getLight().getOrbitSpeedMaxRadiansPerTick();
    }

    private double sourceAngleToRadians(int displayAngle) {
        return Math.toRadians(displayAngle - 90.0);
    }

    private void distributeSourceAngles() {
        int count = sources.size();
        if (count == 0) return;

        double startAngle = sourceAngleToRadians(runtimeConfig.getLightSourceStartAngle());
        double step = 2 * Math.PI / count;

        for (int i = 0; i < count; i++) {
            sources.get(i).setAngle(startAngle + i * step);
        }
    }
}