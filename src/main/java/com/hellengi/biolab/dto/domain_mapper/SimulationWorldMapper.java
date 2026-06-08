package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.physics.Lighting;
import com.hellengi.biolab.dto.CellDto;
import com.hellengi.biolab.dto.DisplayLayersDto;
import com.hellengi.biolab.dto.FoodDto;
import com.hellengi.biolab.dto.LightingDto;
import com.hellengi.biolab.dto.SimulationWorldDto;
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
    private final Lighting lighting;

    public SimulationWorldDto toDto(SimulationWorld world) {
        return toDto(world, DisplayLayersDto.off());
    }

    public SimulationWorldDto toDto(SimulationWorld world, DisplayLayersDto displayLayers) {
        int diameter = config.getTubeDiameter();
        double[] lightMap = lighting.getLightMap();
        double[] lightDirXMap = lighting.getLightDirXMap();
        double[] lightDirYMap = lighting.getLightDirYMap();
        int gridStep = lighting.getLightGridStep();
        int gridWidth = lighting.getLightGridCols();
        int gridHeight = lighting.getLightGridRows();

        List<CellDto> cells;
        cellMapper.useLightMaps(
                lightMap,
                lightDirXMap,
                lightDirYMap,
                gridWidth,
                gridHeight,
                gridStep,
                world.getGlobalLight().getValue()
        );
        try {
            cells = world.getCells().stream().map(cell -> cellMapper.toDto(cell, displayLayers)).toList();
        } finally {
            cellMapper.clearLightMap();
        }

        List<FoodDto> foods = world.getFoods().stream().map(foodMapper::toDto).toList();
        LightingDto lightingDto = lightingMapper.toDto(
                world,
                lightMap,
                gridStep,
                gridWidth,
                gridHeight,
                displayLayers
        );

        return new SimulationWorldDto(
                world.getTick(), world.getTime(), world.getFoodSpawnBudget(), diameter,
                cells, foods, lightingDto
        );
    }
    public SimulationWorldDto toSnapshotDto(SimulationWorld world) {
        int diameter = config.getTubeDiameter();
        double[] lightMap = lighting.getLightMap();
        double[] lightDirXMap = lighting.getLightDirXMap();
        double[] lightDirYMap = lighting.getLightDirYMap();
        int gridStep = lighting.getLightGridStep();
        int gridWidth = lighting.getLightGridCols();
        int gridHeight = lighting.getLightGridRows();

        List<CellDto> cells;
        cellMapper.useLightMaps(lightMap, lightDirXMap, lightDirYMap, gridWidth, gridHeight, gridStep, world.getGlobalLight().getValue());
        try {
            cells = world.getCells().stream().map(cellMapper::toSnapshotDto).toList();
        } finally {
            cellMapper.clearLightMap();
        }

        List<FoodDto> foods = world.getFoods().stream().map(foodMapper::toDto).toList();
        LightingDto lightingDto = lightingMapper.toDto(world, lightMap, gridStep, gridWidth, gridHeight, DisplayLayersDto.off());

        return new SimulationWorldDto(
                world.getTick(), world.getTime(), world.getFoodSpawnBudget(), diameter,
                cells, foods, lightingDto
        );
    }

}




