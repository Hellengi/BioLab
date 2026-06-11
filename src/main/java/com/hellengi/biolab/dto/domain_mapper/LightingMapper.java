package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.LightSource;
import com.hellengi.biolab.domain.physics.Lighting;
import com.hellengi.biolab.domain.spatial.Quadtree;
import com.hellengi.biolab.domain.spatial.SpatialBounds;
import com.hellengi.biolab.dto.DisplayLayersDto;
import com.hellengi.biolab.dto.LightSourceDto;
import com.hellengi.biolab.dto.LightingDto;
import com.hellengi.biolab.dto.QuadtreeNodeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import static com.hellengi.biolab.util.Utils.clamp01;

@Component
@RequiredArgsConstructor
public class LightingMapper {
    private static final int LIGHT_DIRECTION_ARROW_STRIDE_CELLS = 3;
    /**
     * Safety cap for very fine light grids. On the current default 800 / 8 grid
     * this still keeps the requested stride of about three cells, but prevents
     * accidental thousands of debug arrows if gridStep is lowered later.
     */
    private static final int LIGHT_DIRECTION_MAX_ARROWS = 1200;
    private static final int LIGHT_DIRECTION_PACKED_FIELDS = 5;
    private static final double LIGHT_DIRECTION_EPSILON = 1.0e-6;
    private static final double LIGHT_DIRECTION_MIN_LOCAL_LIGHT = 1.0e-5;
    private static final double LIGHT_DIRECTION_MIN_CLARITY = 0.015;

    private final YamlConfig config;
    private final Lighting lighting;

    public LightingDto toDto(SimulationWorld world) {
        int gridStep = Math.max(1, config.getLight().getGridStep());
        int width = (int) Math.ceil(config.getTubeDiameter() / (double) gridStep);
        int height = (int) Math.ceil(config.getTubeDiameter() / (double) gridStep);
        double[] lightMap = lighting.buildLightMap(config.getTubeDiameter(), config.getTubeDiameter(), gridStep);
        return toDto(world, lightMap, gridStep, width, height, DisplayLayersDto.off(), true, false);
    }

    public LightingDto toDto(
            SimulationWorld world,
            double[] lightMap,
            int gridStep,
            int width,
            int height,
            DisplayLayersDto displayLayers
    ) {
        return toDto(world, lightMap, gridStep, width, height, displayLayers, true, true);
    }

    public LightingDto toMetadataDto(
            SimulationWorld world,
            int gridStep,
            int width,
            int height
    ) {
        return toDto(world, null, gridStep, width, height, DisplayLayersDto.off(), false, false);
    }

    public LightingDto toDto(
            SimulationWorld world,
            double[] lightMap,
            int gridStep,
            int width,
            int height,
            DisplayLayersDto displayLayers,
            boolean includeBaseLightMap,
            boolean includeDebugMaps
    ) {
        double centerX = config.worldCenterX();
        double centerY = config.worldCenterY();
        List<LightSourceDto> lightSources = world.getLightSources().stream()
                .map(source -> toDto(source, centerX, centerY))
                .toList();

        DisplayLayersDto layers = displayLayers != null ? displayLayers.normalized() : DisplayLayersDto.off();
        double[] opacityMap = includeDebugMaps && layers.opacityMap() ? lighting.getOpacityMap() : null;
        double[] directedLightMap = includeDebugMaps && (layers.directedLightMap() || layers.lightDirection())
                ? lighting.getDirectedLightMap()
                : null;
        double[] scatteredLightMap = includeDebugMaps && layers.scatteredLightMap() ? lighting.getScatteredLightMap() : null;
        double[] lightDirectionArrows = includeDebugMaps && layers.lightDirection()
                ? buildLightDirectionArrows(world, directedLightMap, gridStep, width, height)
                : new double[0];
        List<QuadtreeNodeDto> quadtreeNodes = includeDebugMaps && layers.quadtree() ? buildQuadtreeNodes(world) : List.of();

        return new LightingDto(
                world.getGlobalLight().getValue(),
                world.getGlobalLight().getCycleTick(),
                lightSources,
                gridStep,
                width,
                height,
                includeBaseLightMap ? lightMap : null,
                includeDebugMaps && layers.directedLightMap() ? directedLightMap : null,
                scatteredLightMap,
                opacityMap,
                lightDirectionArrows,
                quadtreeNodes
        );
    }

    private double[] buildLightDirectionArrows(
            SimulationWorld world,
            double[] lightMap,
            int gridStep,
            int cols,
            int rows
    ) {
        boolean hasLocalSources = !world.getLightSources().isEmpty();
        if (!hasLocalSources || lightMap == null || lightMap.length == 0) {
            return new double[0];
        }

        double[] dirXMap = lighting.getLightDirXMap();
        double[] dirYMap = lighting.getLightDirYMap();
        if (dirXMap == null || dirYMap == null || dirXMap.length == 0 || dirYMap.length == 0) {
            return new double[0];
        }

        int stride = lightDirectionArrowStride(cols, rows);
        double globalLight = Math.max(0.0, world.getGlobalLight().getValue());
        double[] packed = new double[Math.min(
                LIGHT_DIRECTION_MAX_ARROWS,
                ((cols + stride - 1) / stride) * ((rows + stride - 1) / stride)
        ) * LIGHT_DIRECTION_PACKED_FIELDS];
        int size = 0;

        for (int row = 0; row < rows; row += stride) {
            for (int col = 0; col < cols; col += stride) {
                if (size + LIGHT_DIRECTION_PACKED_FIELDS > packed.length) {
                    return trimPackedArrows(packed, size);
                }

                int idx = row * cols + col;
                if (idx < 0 || idx >= lightMap.length || idx >= dirXMap.length || idx >= dirYMap.length) {
                    continue;
                }

                double localSourceLight = Math.max(0.0, lightMap[idx] - globalLight);
                if (localSourceLight <= LIGHT_DIRECTION_MIN_LOCAL_LIGHT) {
                    continue;
                }

                double dirX = dirXMap[idx];
                double dirY = dirYMap[idx];
                double magnitude = Math.hypot(dirX, dirY);
                if (magnitude <= LIGHT_DIRECTION_EPSILON) {
                    continue;
                }

                double clarity = clamp01(magnitude / Math.max(localSourceLight, LIGHT_DIRECTION_EPSILON));
                if (clarity < LIGHT_DIRECTION_MIN_CLARITY) {
                    continue;
                }

                packed[size++] = round3((col + 0.5) * gridStep);
                packed[size++] = round3((row + 0.5) * gridStep);
                packed[size++] = round4(dirX / magnitude);
                packed[size++] = round4(dirY / magnitude);
                packed[size++] = round4(clarity);
            }
        }

        return trimPackedArrows(packed, size);
    }

    private int lightDirectionArrowStride(int cols, int rows) {
        int baseStride = Math.max(1, LIGHT_DIRECTION_ARROW_STRIDE_CELLS);
        int totalCells = Math.max(1, cols * rows);
        int capStride = (int) Math.ceil(Math.sqrt(totalCells / (double) LIGHT_DIRECTION_MAX_ARROWS));
        return Math.max(baseStride, capStride);
    }

    private double[] trimPackedArrows(double[] packed, int size) {
        if (size == packed.length) {
            return packed;
        }

        double[] trimmed = new double[size];
        System.arraycopy(packed, 0, trimmed, 0, size);
        return trimmed;
    }

    private double round3(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }

    private double round4(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }

    private List<QuadtreeNodeDto> buildQuadtreeNodes(SimulationWorld world) {
        Quadtree<Cell> cellIndex = new Quadtree<>(worldBounds(), this::cellBounds);

        for (Cell cell : world.getCells()) {
            if (!cell.isMarkedForRemoval()) {
                cellIndex.insert(cell);
            }
        }

        return cellIndex.nodeBounds().stream()
                .map(bounds -> new QuadtreeNodeDto(
                        bounds.minX(),
                        bounds.minY(),
                        bounds.maxX() - bounds.minX(),
                        bounds.maxY() - bounds.minY()
                ))
                .toList();
    }

    private SpatialBounds cellBounds(Cell cell) {
        return SpatialBounds.fromCenterAndRadius(cell.getX(), cell.getY(), cell.getRadius());
    }

    private SpatialBounds worldBounds() {
        double margin = Math.max(
                32.0,
                config.getCell().getBaseRadius()
                        + config.getCell().getEnergyToRadiusFactor()
        );
        double diameter = config.getTubeDiameter();
        return SpatialBounds.fromMinMax(-margin, -margin, diameter + margin, diameter + margin);
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


