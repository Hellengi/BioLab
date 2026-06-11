package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.api.websocket.ClientViewport;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.physics.Lighting;
import com.hellengi.biolab.dto.CellDetailsDto;
import com.hellengi.biolab.dto.CellDto;
import com.hellengi.biolab.dto.CellRenderDto;
import com.hellengi.biolab.dto.DisplayLayersDto;
import com.hellengi.biolab.dto.FoodDto;
import com.hellengi.biolab.dto.LightingDto;
import com.hellengi.biolab.dto.SimulationLightingFrameDto;
import com.hellengi.biolab.dto.SimulationRenderFrameDto;
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
        LightGrid grid = currentLightGrid();
        DisplayLayersDto layers = normalize(displayLayers);

        RenderMappingContext context = renderContext(world, grid);
        List<CellDto> cells = world.getCells().stream()
                .map(cell -> cellMapper.toDto(cell, layers, context))
                .toList();

        List<FoodDto> foods = world.getFoods().stream().map(foodMapper::toDto).toList();
        LightingDto lightingDto = lightingMapper.toDto(
                world,
                grid.lightMap(),
                grid.step(),
                grid.width(),
                grid.height(),
                layers,
                true,
                true
        );

        return new SimulationWorldDto(
                world.getTick(), world.getTime(), world.getFoodSpawnBudget(), config.getTubeDiameter(),
                cells, foods, lightingDto
        );
    }

    public SimulationRenderFrameDto toRenderFrameDto(
            SimulationWorld world,
            DisplayLayersDto displayLayers,
            Long tps
    ) {
        return toRenderFrameDto(world, displayLayers, ClientViewport.FULL_WORLD, tps);
    }

    public SimulationRenderFrameDto toRenderFrameDto(
            SimulationWorld world,
            DisplayLayersDto displayLayers,
            ClientViewport viewport,
            Long tps
    ) {
        LightGrid grid = currentLightGrid();
        ClientViewport visibleArea = viewport == null
                ? ClientViewport.FULL_WORLD
                : viewport.normalized(com.hellengi.biolab.api.websocket.BroadcastConstants.VIEWPORT_MARGIN_WORLD_UNITS);

        List<CellRenderDto> cells;
        RenderMappingContext context = renderContext(world, grid);
        cells = world.getCells().stream()
                .filter(cell -> visibleArea.intersectsCircle(cell.getX(), cell.getY(), cell.getRadius()))
                .map(cell -> cellMapper.toRenderDto(cell, context))
                .toList();

        List<FoodDto> foods = world.getFoods().stream()
                .filter(food -> food.getCapturedByCellId() != null || visibleArea.intersectsCircle(food.getX(), food.getY(), food.getRadius()))
                .map(foodMapper::toDto)
                .toList();
        LightingDto lightingMetadata = lightingMapper.toMetadataDto(world, grid.step(), grid.width(), grid.height());

        return new SimulationRenderFrameDto(
                world.getTick(),
                world.getTime(),
                world.getFoodSpawnBudget(),
                config.getTubeDiameter(),
                cells,
                foods,
                lightingMetadata,
                tps
        );
    }

    public SimulationLightingFrameDto toLightingFrameDto(SimulationWorld world, DisplayLayersDto displayLayers) {
        LightGrid grid = currentLightGrid();
        LightingDto lightingDto = lightingMapper.toDto(
                world,
                grid.lightMap(),
                grid.step(),
                grid.width(),
                grid.height(),
                normalize(displayLayers),
                true,
                true
        );
        return new SimulationLightingFrameDto(world.getTick(), world.getTime(), lightingDto);
    }

    public CellDetailsDto toCellDetailsDto(SimulationWorld world, DisplayLayersDto displayLayers) {
        DisplayLayersDto layers = normalize(displayLayers);
        Long selectedCellId = layers.selectedCellId();
        if (selectedCellId == null) {
            return new CellDetailsDto(world.getTick(), null, null);
        }

        LightGrid grid = currentLightGrid();
        RenderMappingContext context = renderContext(world, grid);
        CellDto selected = world.getCells().stream()
                .filter(cell -> cell.getId() == selectedCellId)
                .findFirst()
                .map(cell -> cellMapper.toDto(cell, layers, context))
                .orElse(null);
        return new CellDetailsDto(world.getTick(), selectedCellId, selected);
    }

    public SimulationWorldDto toSnapshotDto(SimulationWorld world) {
        LightGrid grid = currentLightGrid();

        RenderMappingContext context = renderContext(world, grid);
        List<CellDto> cells = world.getCells().stream()
                .map(cell -> cellMapper.toSnapshotDto(cell, context))
                .toList();

        List<FoodDto> foods = world.getFoods().stream().map(foodMapper::toDto).toList();
        LightingDto lightingDto = lightingMapper.toDto(
                world,
                grid.lightMap(),
                grid.step(),
                grid.width(),
                grid.height(),
                DisplayLayersDto.off(),
                true,
                false
        );

        return new SimulationWorldDto(
                world.getTick(), world.getTime(), world.getFoodSpawnBudget(), config.getTubeDiameter(),
                cells, foods, lightingDto
        );
    }


    private RenderMappingContext renderContext(SimulationWorld world, LightGrid grid) {
        return new RenderMappingContext(
                grid.lightMap(),
                grid.lightDirXMap(),
                grid.lightDirYMap(),
                grid.width(),
                grid.height(),
                grid.step(),
                world.getGlobalLight().getValue()
        );
    }

    private LightGrid currentLightGrid() {
        return new LightGrid(
                lighting.getLightMap(),
                lighting.getLightDirXMap(),
                lighting.getLightDirYMap(),
                lighting.getLightGridStep(),
                lighting.getLightGridCols(),
                lighting.getLightGridRows()
        );
    }

    private DisplayLayersDto normalize(DisplayLayersDto displayLayers) {
        return displayLayers == null ? DisplayLayersDto.off() : displayLayers.normalized();
    }

    private record LightGrid(
            double[] lightMap,
            double[] lightDirXMap,
            double[] lightDirYMap,
            int step,
            int width,
            int height
    ) {
    }
}


