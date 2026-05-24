package com.hellengi.biolab.mapper.api;

import com.hellengi.biolab.api.dto.LightSourceDto;
import com.hellengi.biolab.api.dto.LightingDto;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.LightSource;
import com.hellengi.biolab.domain.physics.Lighting;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class LightingMapper {
    private final YamlConfig config;
    private final Lighting lighting;

    public LightingDto toDto(SimulationWorld env) {
        double centerX = config.worldCenterX();
        double centerY = config.worldCenterY();

        List<LightSourceDto> sourceDtos = env.getLightSources().stream()
                .map(s -> toDto(s, centerX, centerY))
                .toList();

        int gridStep = config.getLight().getGridStep();

        return new LightingDto(
                env.getGlobalLight(),
                sourceDtos,
                gridStep,
                lightMapWidth(gridStep),
                lightMapHeight(gridStep),
                lighting.buildLightMap(
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