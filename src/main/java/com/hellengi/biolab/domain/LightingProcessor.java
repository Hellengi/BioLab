package com.hellengi.biolab.domain;

import com.hellengi.biolab.api.dto.LightSourceDto;
import com.hellengi.biolab.api.dto.LightingDto;
import com.hellengi.biolab.domain.model.LightSource;
import com.hellengi.biolab.domain.physics.Lighting;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Mutates lighting state only when invoked by SimulationEngine inside the world lock. */
@Component
@RequiredArgsConstructor
final class LightingProcessor {
    private final RuntimeOverrides runtimeConfig;
    private final Lighting lighting;

    private Integer lastDistributedSourceCount;
    private Integer lastDistributedStartAngle;

    void process(SimulationWorld world, double tickScale) {
        if (runtimeConfig.isGlobalLightCycleEnabled()) {
            world.advanceGlobalLightCyclePhase(tickScale);
        }
        syncConfiguredState(world);
        for (LightSource source : world.getLightSources()) {
            source.advanceAngle(tickScale);
        }
    }

    void syncConfiguredState(SimulationWorld world) {
        world.setGlobalLight(lighting.configuredGlobalLight(world.getGlobalLightCycleElapsedTicks()));

        int targetCount = lighting.configuredSourceCount();
        int currentCount = world.getLightSources().size();
        boolean countChanged = currentCount != targetCount;

        while (currentCount < targetCount) {
            world.addLightSource(lighting.createConfiguredSource());
            currentCount++;
        }
        if (currentCount > targetCount) {
            world.removeLightSourcesFrom(targetCount);
        }

        for (LightSource source : world.getLightSources()) {
            source.setBrightness(lighting.configuredBrightness());
            source.setOrbitRadius(lighting.configuredOrbitRadius());
            source.setOrbitSpeed(lighting.configuredOrbitSpeed());
        }

        int startAngle = lighting.configuredStartAngle();
        if (countChanged
                || lastDistributedSourceCount == null
                || lastDistributedStartAngle == null
                || lastDistributedSourceCount != targetCount
                || lastDistributedStartAngle != startAngle) {
            distributeSourceAngles(world);
            lastDistributedSourceCount = targetCount;
            lastDistributedStartAngle = startAngle;
        }
    }

    void reset(SimulationWorld world) {
        lastDistributedSourceCount = null;
        lastDistributedStartAngle = null;
        syncConfiguredState(world);
    }

    void loadSnapshot(SimulationWorld world, LightingDto lightingDto) {
        world.clearLightSources();
        if (lightingDto != null && lightingDto.sources() != null) {
            for (LightSourceDto dto : lightingDto.sources()) {
                world.addLightSource(new LightSource(
                        dto.orbitRadius(), dto.orbitSpeed(), dto.brightness(), dto.angle()
                ));
            }
            lastDistributedSourceCount = world.getLightSources().size();
            lastDistributedStartAngle = lighting.configuredStartAngle();
        } else {
            lastDistributedSourceCount = null;
            lastDistributedStartAngle = null;
        }
        syncConfiguredState(world);
    }

    private void distributeSourceAngles(SimulationWorld world) {
        int count = world.getLightSources().size();
        if (count == 0) {
            return;
        }

        double startAngle = lighting.configuredStartAngleRadians();
        double step = 2.0 * Math.PI / count;
        for (int i = 0; i < count; i++) {
            world.getLightSources().get(i).setAngle(startAngle + i * step);
        }
    }
}
