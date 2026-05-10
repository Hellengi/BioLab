package com.hellengi.biolab.simulation.mapper;

import com.hellengi.biolab.api.dto.LightSourceDto;
import com.hellengi.biolab.api.dto.LightingDto;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.LightSource;
import com.hellengi.biolab.simulation.lighting.LightingSystem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class LightingMapper {
    private final YamlConfig config;
    private final LightingSystem lightingSystem;

    public LightingDto toDto(List<LightSource> sources, double globalLight) {
        double centerX = config.worldCenterX();
        double centerY = config.worldCenterY();

        List<LightSourceDto> sourceDtos = sources.stream()
                .map(s -> toDto(s, centerX, centerY))
                .toList();

        int gridStep = config.getLight().getGridStep();

        return new LightingDto(
                globalLight,
                sourceDtos,
                gridStep,
                lightMapWidth(gridStep),
                lightMapHeight(gridStep),
                lightingSystem.buildLightMap(
                        config.getTubeDiameter(),
                        config.getTubeDiameter(),
                        gridStep
                )
        );
    }

    private int lightMapWidth(int gridStep) {
        return (int) Math.ceil(config.getTubeDiameter() / (double) gridStep);
    }

    private int lightMapHeight(int gridStep) {
        return (int) Math.ceil(config.getTubeDiameter() / (double) gridStep);
    }

    private LightSourceDto toDto(LightSource source, double centerX, double centerY) {
        return new LightSourceDto(
                source.currentX(centerX),
                source.currentY(centerY),
                source.getBrightness(),
                source.getOrbitRadius(),
                source.getOrbitSpeed(),
                source.getAngle(),
                renderType(source)
        );
    }

    private String renderType(LightSource source) {
        return isWallMounted(source)
                ? "EDGE"
                : "POINT";
    }

    private boolean isWallMounted(LightSource source) {
        return Math.abs(source.getOrbitRadius() - config.worldRadius()) < 0.001;
    }
}