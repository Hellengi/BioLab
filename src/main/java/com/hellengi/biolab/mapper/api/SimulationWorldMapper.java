package com.hellengi.biolab.mapper.api;

import com.hellengi.biolab.api.dto.CellDto;
import com.hellengi.biolab.api.dto.FoodDto;
import com.hellengi.biolab.api.dto.LightingDto;
import com.hellengi.biolab.api.dto.SimulationWorldDto;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class SimulationWorldMapper {
    private final YamlConfig config;
    private final CellMapper cellMapper;
    private final FoodMapper foodMapper;
    private final LightingMapper lightingMapper;

    public SimulationWorldDto toDto(SimulationWorld world, long tps, boolean running) {
        List<CellDto> cells = world.getCells().stream().map(cellMapper::toDto).toList();
        List<FoodDto> foods = world.getFoods().stream().map(foodMapper::toDto).toList();
        LightingDto lighting = lightingMapper.toDto(world);

        return new SimulationWorldDto(
                world.getTick(),
                world.getGlobalLightCycleElapsedTicks(),
                world.getFoodSpawnProgress(),
                tps,
                config.getTubeDiameter(),
                running,
                cells,
                foods,
                lighting
        );
    }
}
