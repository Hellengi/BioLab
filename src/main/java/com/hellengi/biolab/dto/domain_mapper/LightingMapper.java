package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.LightSource;
import com.hellengi.biolab.domain.physics.Lighting;
import com.hellengi.biolab.dto.LightSourceDto;
import com.hellengi.biolab.dto.LightingDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class LightingMapper {
    private final YamlConfig config;
    private final Lighting lighting;

    public LightingDto toDto(SimulationWorld world) {
        int gridStep = Math.max(1, config.getLight().getGridStep());
        int width = (int) Math.ceil(config.getTubeDiameter() / (double) gridStep);
        int height = (int) Math.ceil(config.getTubeDiameter() / (double) gridStep);
        double[] lightMap = lighting.buildLightMap(config.getTubeDiameter(), config.getTubeDiameter(), gridStep);
        return toDto(world, lightMap, gridStep, width, height);
    }

    public LightingDto toDto(SimulationWorld world, double[] lightMap, int gridStep, int width, int height) {
        double centerX = config.worldCenterX();
        double centerY = config.worldCenterY();
        List<LightSourceDto> lightSources = world.getLightSources().stream()
                .map(source -> toDto(source, centerX, centerY))
                .toList();

        return new LightingDto(
                world.getGlobalLight().getValue(),
                world.getGlobalLight().getCycleTick(),
                lightSources,
                gridStep,
                width,
                height,
                lightMap
        );
    }

    private LightSourceDto toDto(LightSource source, double centerX, double centerY) {
        return new LightSourceDto(
                source.getX(centerX),
                source.getY(centerY),
                source.getBrightness(),
                source.getOrbitRadius(),
                source.getOrbitSpeed(),
                source.getAngle(),
                Math.abs(source.getOrbitRadius() - config.worldRadius()) < 0.001 ? "EDGE" : "POINT"
        );
    }
}
