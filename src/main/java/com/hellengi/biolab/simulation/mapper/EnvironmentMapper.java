package com.hellengi.biolab.simulation.mapper;

import com.hellengi.biolab.api.dto.CellDto;
import com.hellengi.biolab.api.dto.EnvironmentDto;
import com.hellengi.biolab.api.dto.FoodDto;
import com.hellengi.biolab.api.dto.LightingDto;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.LightSource;
import com.hellengi.biolab.simulation.world.WorldState;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class EnvironmentMapper {
    private final YamlConfig config;
    private final CellMapper cellMapper;
    private final FoodMapper foodMapper;
    private final LightingMapper lightingMapper;

    public EnvironmentDto toDto(
            WorldState env,
            long deadCellLifetimeTicks,
            long tps,
            List<LightSource> lightSources,
            double globalLight
    ) {
        List<CellDto> cellDtos = env.getCells().stream()
                .map(cellMapper::toDto)
                .toList();

        List<CellDto> deadCellDtos = env.getDeadCells().stream()
                .map(deadCell -> cellMapper.toDto(deadCell, deadCellLifetimeTicks))
                .toList();

        List<FoodDto> foodDtos = env.getFoods().stream()
                .map(foodMapper::toDto)
                .toList();

        LightingDto lightingDto = lightingMapper.toDto(lightSources, globalLight);

        return new EnvironmentDto(
                env.getTick(),
                tps,
                config.getTubeDiameter(),
                env.isRunning(),
                cellDtos,
                deadCellDtos,
                foodDtos,
                lightingDto
        );
    }
}