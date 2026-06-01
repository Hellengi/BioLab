
package com.hellengi.biolab.domain.physics;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.LightSource;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import com.hellengi.biolab.dto.LightSourceDto;
import com.hellengi.biolab.dto.LightingDto;
import com.hellengi.biolab.util.SliderScale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Lighting system with opacity-based shadows.
 *
 * Pipeline:
 *   1. buildOpacityMap() rasterizes cells + turbidity into a coarse optical-density grid.
 *   2. buildLightMap() casts angular rays from every source using DDA grid traversal.
 *      This is much cheaper and visually more stable than marching a separate ray
 *      from the source to every light-map cell.
 *   3. sampleLightMap() returns per-cell irradiance by bilinear interpolation.
 */
@Component
@RequiredArgsConstructor
public class Lighting {

    /**
     * Area-light sampling makes shadows soft without blurring the final light map.
     * Because every real source is represented by several virtual sources, each
     * virtual source can use fewer angular rays than the previous hard-shadow pass.
     */
    private static final int MIN_RAYS_PER_SOURCE = 360;
    private static final double RAYS_PER_GRID_EDGE_CELL = 1.25;

    /**
     * Radius of a point light source in light-map grid cells. Bigger value gives
     * wider penumbra, but also makes shadows softer.
     */
    private static final double POINT_AREA_LIGHT_RADIUS_GRID_CELLS = 2.0;

    /**
     * Half-length of an edge/wall light source in light-map grid cells. Edge
     * sources are sampled along the wall tangent and emit only into the tube.
     */
    private static final double EDGE_AREA_LIGHT_HALF_LENGTH_GRID_CELLS = 4.0;
    private static final double MAX_OPTICAL_DEPTH = 30.0;
    private static final double SOURCE_CLAMP_EPSILON = 0.001;
    private static final double DIRECTION_EPSILON = 1.0e-9;
    private static final double EDGE_SOURCE_RADIUS_EPSILON = 0.001;

    /**
     * {offsetX, offsetY, weight}. Offsets are multiplied by
     * POINT_AREA_LIGHT_RADIUS_GRID_CELLS * gridStep. Weights sum to 1.
     */
    private static final double[][] POINT_AREA_LIGHT_SAMPLES = {
            { 0.0,  0.0, 0.36},
            { 1.0,  0.0, 0.16},
            {-1.0,  0.0, 0.16},
            { 0.0,  1.0, 0.16},
            { 0.0, -1.0, 0.16}
    };

    /**
     * {tangentOffset, unused, weight}. Edge sources are sampled only along the
     * wall tangent, so the soft shadow remains directional and does not leak
     * behind the light source. Weights sum to 1.
     */
    private static final double[][] EDGE_AREA_LIGHT_SAMPLES = {
            {-1.0, 0.0, 0.12},
            {-0.5, 0.0, 0.20},
            { 0.0, 0.0, 0.36},
            { 0.5, 0.0, 0.20},
            { 1.0, 0.0, 0.12}
    };

    private final YamlConfig config;
    private final RuntimeOverrides runtimeConfig;
    private final SimulationWorld world;

    private Integer lastDistributedSourceCount;
    private Integer lastDistributedStartAngle;

    private double[] cachedLightMap;
    private double[] cachedOpacityMap;
    private int cachedGridStep;
    private int cachedCols;
    private int cachedRows;
    private boolean lightCacheDirty = true;

    // -------------------------------------------------------------------------
    // Simulation tick
    // -------------------------------------------------------------------------

    public void process(SimulationWorld world, double tickScale) {
        world.getGlobalLight().incrementTick(tickScale);
        applyRuntimeConfig(world);

        for (LightSource source : world.getLightSources()) {
            source.updateAngle(tickScale);
        }

        invalidateLightCache();
    }

    public void applyRuntimeConfig(SimulationWorld world) {
        syncGlobalLight(world);
        syncLightSources(world);
        invalidateLightCache();
    }

    public void reset(SimulationWorld world) {
        lastDistributedSourceCount = null;
        lastDistributedStartAngle = null;
        applyRuntimeConfig(world);
    }

    public void loadSnapshot(SimulationWorld world, LightingDto lightingDto) {
        world.clearLightSources();

        if (lightingDto != null && lightingDto.sources() != null) {
            world.getGlobalLight().setCycleTick(lightingDto.cycleTick());
            for (LightSourceDto dto : lightingDto.sources()) {
                world.addLightSource(new LightSource(
                        dto.orbitRadius(),
                        dto.orbitSpeed(),
                        dto.brightness(),
                        dto.angle()
                ));
            }
            lastDistributedSourceCount = world.getLightSources().size();
            lastDistributedStartAngle = runtimeConfig.getLightSourceStartAngle();
        } else {
            lastDistributedSourceCount = null;
            lastDistributedStartAngle = null;
        }

        applyRuntimeConfig(world);
    }

    public void invalidateLightCache() {
        lightCacheDirty = true;
    }

    public double[] getLightMap() {
        ensureLightCache();
        return cachedLightMap;
    }

    public double[] getOpacityMap() {
        ensureLightCache();
        return cachedOpacityMap;
    }

    public int getLightGridStep() {
        ensureLightCache();
        return cachedGridStep;
    }

    public int getLightGridCols() {
        ensureLightCache();
        return cachedCols;
    }

    public int getLightGridRows() {
        ensureLightCache();
        return cachedRows;
    }

    public double sampleLightAt(double x, double y) {
        ensureLightCache();
        return sampleLightMap(cachedLightMap, cachedCols, cachedRows, cachedGridStep, x, y);
    }

    private void ensureLightCache() {
        int diameter = config.getTubeDiameter();
        int gridStep = Math.max(1, config.getLight().getGridStep());
        int cols = (int) Math.ceil(diameter / (double) gridStep);
        int rows = (int) Math.ceil(diameter / (double) gridStep);

        boolean geometryChanged = cachedLightMap == null
                || cachedOpacityMap == null
                || cachedGridStep != gridStep
                || cachedCols != cols
                || cachedRows != rows;

        if (!lightCacheDirty && !geometryChanged) {
            return;
        }

        cachedGridStep = gridStep;
        cachedCols = cols;
        cachedRows = rows;
        cachedOpacityMap = buildOpacityMap(diameter, diameter, gridStep);
        cachedLightMap = buildLightMapFromOpacityMap(
                diameter,
                diameter,
                gridStep,
                cols,
                rows,
                cachedOpacityMap
        );
        lightCacheDirty = false;
    }

    // -------------------------------------------------------------------------
    // Public API used by mappers
    // -------------------------------------------------------------------------

    public double[] buildOpacityMap(int width, int height, int gridStep) {
        int safeGridStep = Math.max(1, gridStep);
        int cols = (int) Math.ceil(width  / (double) safeGridStep);
        int rows = (int) Math.ceil(height / (double) safeGridStep);
        double[] opacityMap = new double[cols * rows];

        // Turbidity is an extinction coefficient per world pixel.
        // Convert it to opacity per one grid cell. DDA later multiplies it by
        // actual segment length / gridStep, so diagonal rays are attenuated correctly.
        double turbidityPerGridCell = runtimeConfig.getTurbidityAttenuation() * safeGridStep;
        if (turbidityPerGridCell > 0.0) {
            Arrays.fill(opacityMap, turbidityPerGridCell);
        }

        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) {
                continue;
            }

            double cx = cell.getX();
            double cy = cell.getY();
            double cr = cell.getRadius();

            int colMin = Math.max(0, (int) Math.floor((cx - cr) / safeGridStep));
            int colMax = Math.min(cols - 1, (int) Math.ceil((cx + cr) / safeGridStep));
            int rowMin = Math.max(0, (int) Math.floor((cy - cr) / safeGridStep));
            int rowMax = Math.min(rows - 1, (int) Math.ceil((cy + cr) / safeGridStep));

            for (int row = rowMin; row <= rowMax; row++) {
                for (int col = colMin; col <= colMax; col++) {
                    double gx = (col + 0.5) * safeGridStep;
                    double gy = (row + 0.5) * safeGridStep;

                    double overlap = circleRectOverlapFraction(cx, cy, cr, gx, gy, safeGridStep);
                    if (overlap <= 0.0) {
                        continue;
                    }

                    opacityMap[row * cols + col] += cell.getOpacity() * overlap;
                }
            }
        }

        return opacityMap;
    }

    /**
     * Builds a light map by casting rays outward from each source.
     *
     * Complexity is roughly O(sources * rays * cellsAlongRay), instead of
     * O(sources * allGridCells * samplesPerTargetRay). This fixes the main
     * slowdown and also removes broken shadows caused by too few samples on
     * long target rays.
     */
    public double[] buildLightMap(int width, int height, int gridStep) {
        int safeGridStep = Math.max(1, gridStep);
        int cols = (int) Math.ceil(width  / (double) safeGridStep);
        int rows = (int) Math.ceil(height / (double) safeGridStep);
        double[] opacityMap = buildOpacityMap(width, height, safeGridStep);
        return buildLightMapFromOpacityMap(width, height, safeGridStep, cols, rows, opacityMap);
    }

    public double sampleLightMap(double[] lightMap, int cols, int rows,
                                 int gridStep, double wx, double wy) {
        if (lightMap == null || lightMap.length == 0 || cols <= 0 || rows <= 0) {
            return world.getGlobalLight().getValue();
        }

        int safeGridStep = Math.max(1, gridStep);

        double gx = wx / safeGridStep - 0.5;
        double gy = wy / safeGridStep - 0.5;

        int col0 = (int) Math.floor(gx);
        int row0 = (int) Math.floor(gy);
        int col1 = col0 + 1;
        int row1 = row0 + 1;

        double tx = gx - col0;
        double ty = gy - row0;

        col0 = Math.max(0, Math.min(cols - 1, col0));
        col1 = Math.max(0, Math.min(cols - 1, col1));
        row0 = Math.max(0, Math.min(rows - 1, row0));
        row1 = Math.max(0, Math.min(rows - 1, row1));

        double v00 = lightMap[row0 * cols + col0];
        double v10 = lightMap[row0 * cols + col1];
        double v01 = lightMap[row1 * cols + col0];
        double v11 = lightMap[row1 * cols + col1];

        double top    = v00 + (v10 - v00) * tx;
        double bottom = v01 + (v11 - v01) * tx;
        return Math.max(0.0, top + (bottom - top) * ty);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private double[] buildLightMapFromOpacityMap(
            int width,
            int height,
            int gridStep,
            int cols,
            int rows,
            double[] opacityMap
    ) {
        double[] lightMap = new double[cols * rows];

        double ambient = world.getGlobalLight().getValue();
        Arrays.fill(lightMap, ambient);

        if (world.getLightSources().isEmpty()) {
            return lightMap;
        }

        double centerX = config.worldCenterX();
        double centerY = config.worldCenterY();
        double r0 = Math.max(1.0, config.getLight().getFalloffFactor());
        double r0sq = r0 * r0;

        int rayCount = rayCountFor(cols, rows);

        for (LightSource source : world.getLightSources()) {
            accumulateAreaLight(
                    lightMap,
                    opacityMap,
                    cols,
                    rows,
                    gridStep,
                    width,
                    height,
                    source,
                    centerX,
                    centerY,
                    r0sq,
                    rayCount
            );
        }

        return lightMap;
    }

    private int rayCountFor(int cols, int rows) {
        int edge = Math.max(cols, rows);
        return Math.max(
                MIN_RAYS_PER_SOURCE,
                (int) Math.ceil(2.0 * Math.PI * edge * RAYS_PER_GRID_EDGE_CELL)
        );
    }

    private void accumulateAreaLight(
            double[] lightMap,
            double[] opacityMap,
            int cols,
            int rows,
            int gridStep,
            int width,
            int height,
            LightSource source,
            double centerX,
            double centerY,
            double r0sq,
            int baseRayCount
    ) {
        double brightness = source.getBrightness();
        if (brightness <= 0.0) {
            return;
        }

        double sx = source.getX(centerX);
        double sy = source.getY(centerY);
        boolean edgeSource = isEdgeSource(source);
        double[][] samples = edgeSource ? EDGE_AREA_LIGHT_SAMPLES : POINT_AREA_LIGHT_SAMPLES;

        double tangentX = -Math.sin(source.getAngle());
        double tangentY =  Math.cos(source.getAngle());

        double pointRadius = POINT_AREA_LIGHT_RADIUS_GRID_CELLS * gridStep;
        double edgeHalfLength = EDGE_AREA_LIGHT_HALF_LENGTH_GRID_CELLS * gridStep;

        int rayCount = edgeSource
                ? Math.max(MIN_RAYS_PER_SOURCE / 2, baseRayCount / 2)
                : baseRayCount;
        double angleSpan = edgeSource ? Math.PI : 2.0 * Math.PI;
        double startAngle = edgeSource
                ? source.getAngle() + Math.PI - angleSpan * 0.5
                : 0.0;

        double[] virtualSourceMap = new double[cols * rows];

        for (int sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
            double[] sample = samples[sampleIndex];
            double sampleX;
            double sampleY;

            if (edgeSource) {
                double offset = sample[0] * edgeHalfLength;
                sampleX = sx + tangentX * offset;
                sampleY = sy + tangentY * offset;
            } else {
                sampleX = sx + sample[0] * pointRadius;
                sampleY = sy + sample[1] * pointRadius;
            }

            sampleX = clamp(sampleX, SOURCE_CLAMP_EPSILON, width  - SOURCE_CLAMP_EPSILON);
            sampleY = clamp(sampleY, SOURCE_CLAMP_EPSILON, height - SOURCE_CLAMP_EPSILON);

            Arrays.fill(virtualSourceMap, 0.0);

            // A tiny per-sample phase shift reduces angular banding without any blur.
            double phaseShift = angleSpan * sampleIndex / (rayCount * samples.length);
            double sampleBrightness = brightness * sample[2];

            for (int i = 0; i < rayCount; i++) {
                double angle = startAngle + phaseShift + angleSpan * (i + 0.5) / rayCount;
                castLightRay(
                        virtualSourceMap,
                        opacityMap,
                        cols,
                        rows,
                        gridStep,
                        sampleX,
                        sampleY,
                        Math.cos(angle),
                        Math.sin(angle),
                        sampleBrightness,
                        r0sq
                );
            }

            for (int i = 0; i < lightMap.length; i++) {
                lightMap[i] += virtualSourceMap[i];
            }
        }
    }

    private boolean isEdgeSource(LightSource source) {
        return Math.abs(source.getOrbitRadius() - config.worldRadius()) < EDGE_SOURCE_RADIUS_EPSILON;
    }

    private void castLightRay(
            double[] sourceMap,
            double[] opacityMap,
            int cols,
            int rows,
            int gridStep,
            double sx,
            double sy,
            double dirX,
            double dirY,
            double brightness,
            double r0sq
    ) {
        int col = Math.max(0, Math.min(cols - 1, (int) Math.floor(sx / gridStep)));
        int row = Math.max(0, Math.min(rows - 1, (int) Math.floor(sy / gridStep)));

        int stepX = dirX >= 0.0 ? 1 : -1;
        int stepY = dirY >= 0.0 ? 1 : -1;

        double tDeltaX = Math.abs(dirX) < DIRECTION_EPSILON
                ? Double.POSITIVE_INFINITY
                : gridStep / Math.abs(dirX);
        double tDeltaY = Math.abs(dirY) < DIRECTION_EPSILON
                ? Double.POSITIVE_INFINITY
                : gridStep / Math.abs(dirY);

        double nextBoundaryX = stepX > 0 ? (col + 1) * gridStep : col * gridStep;
        double nextBoundaryY = stepY > 0 ? (row + 1) * gridStep : row * gridStep;

        double tMaxX = Math.abs(dirX) < DIRECTION_EPSILON
                ? Double.POSITIVE_INFINITY
                : (nextBoundaryX - sx) / dirX;
        double tMaxY = Math.abs(dirY) < DIRECTION_EPSILON
                ? Double.POSITIVE_INFINITY
                : (nextBoundaryY - sy) / dirY;

        if (tMaxX < 0.0) tMaxX = 0.0;
        if (tMaxY < 0.0) tMaxY = 0.0;

        double currentT = 0.0;
        double opticalDepth = 0.0;

        int safety = cols + rows + 4;
        while (col >= 0 && col < cols && row >= 0 && row < rows && safety-- > 0) {
            double nextT = Math.min(tMaxX, tMaxY);
            double sampleT = currentT + Math.max(0.0, nextT - currentT) * 0.5;

            int idx = row * cols + col;

            double transmittance = Math.exp(-Math.min(MAX_OPTICAL_DEPTH, opticalDepth));
            double falloff = r0sq / (sampleT * sampleT + r0sq);
            double contribution = brightness * falloff * transmittance;

            // Several rays can hit the same grid cell. Keep max per source, not sum,
            // otherwise brightness depends on ray density.
            if (contribution > sourceMap[idx]) {
                sourceMap[idx] = contribution;
            }

            double segmentLength = Math.max(0.0, nextT - currentT);
            opticalDepth += opacityMap[idx] * (segmentLength / gridStep);
            if (opticalDepth >= MAX_OPTICAL_DEPTH) {
                break;
            }

            currentT = nextT;

            if (tMaxX < tMaxY) {
                tMaxX += tDeltaX;
                col += stepX;
            } else if (tMaxY < tMaxX) {
                tMaxY += tDeltaY;
                row += stepY;
            } else {
                tMaxX += tDeltaX;
                tMaxY += tDeltaY;
                col += stepX;
                row += stepY;
            }
        }
    }

    /**
     * Approximates the fraction [0, 1] of a square grid cell's area covered by a circle.
     * A 5x5 center-sample grid is still cheap because it is used only near cell bounds,
     * but it removes many blocky opacity artifacts from the previous 3x3 corner test.
     */
    private double circleRectOverlapFraction(
            double cx, double cy, double cr,
            double gx, double gy, int gridStep
    ) {
        double half = gridStep * 0.5;

        if (Math.abs(cx - gx) > cr + half || Math.abs(cy - gy) > cr + half) {
            return 0.0;
        }

        double crSq = cr * cr;
        double dxMax = Math.abs(cx - gx) + half;
        double dyMax = Math.abs(cy - gy) + half;
        if (dxMax * dxMax + dyMax * dyMax <= crSq) {
            return 1.0;
        }

        int samples = 5;
        int inside = 0;
        for (int si = 0; si < samples; si++) {
            double px = gx - half + (si + 0.5) * gridStep / samples;
            for (int sj = 0; sj < samples; sj++) {
                double py = gy - half + (sj + 0.5) * gridStep / samples;
                double ddx = px - cx;
                double ddy = py - cy;
                if (ddx * ddx + ddy * ddy <= crSq) {
                    inside++;
                }
            }
        }

        return inside / (double) (samples * samples);
    }

    // -------------------------------------------------------------------------
    // Light source management
    // -------------------------------------------------------------------------

    private void syncGlobalLight(SimulationWorld world) {
        world.getGlobalLight().set(
                runtimeConfig.getStaticGlobalLight(),
                runtimeConfig.isGlobalLightCycleEnabled(),
                runtimeConfig.getGlobalLightCycleMin(),
                runtimeConfig.getGlobalLightCyclePeriodSeconds()
        );
        world.getGlobalLight().update(config.getTickRateMs());
    }

    private void syncLightSources(SimulationWorld world) {
        int targetCount  = runtimeConfig.getLightSourceCount();
        int currentCount = world.getLightSources().size();
        boolean countChanged = currentCount != targetCount;

        while (currentCount < targetCount) {
            world.addLightSource(new LightSource(
                    configuredOrbitRadius(),
                    configuredOrbitSpeed(),
                    runtimeConfig.getLightSourceBrightness(),
                    0.0
            ));
            currentCount++;
        }

        while (currentCount > targetCount) {
            world.removeLightSource();
            currentCount--;
        }

        for (LightSource source : world.getLightSources()) {
            source.setBrightness(runtimeConfig.getLightSourceBrightness());
            source.setOrbitRadius(configuredOrbitRadius());
            source.setOrbitSpeed(configuredOrbitSpeed());
        }

        int startAngle = runtimeConfig.getLightSourceStartAngle();
        if (countChanged
                || lastDistributedSourceCount == null
                || lastDistributedStartAngle == null
                || lastDistributedSourceCount != targetCount
                || lastDistributedStartAngle != startAngle) {
            distributeSourceAngles(world);
            lastDistributedSourceCount = targetCount;
            lastDistributedStartAngle  = startAngle;
        }
    }

    private double configuredOrbitRadius() {
        return SliderScale.linear(
                runtimeConfig.getLightSourceOrbitRadius(),
                0.0,
                config.worldRadius()
        );
    }

    private double configuredOrbitSpeed() {
        return config.getLight().getOrbitSpeedMaxRadiansPerTick()
                / 100.0 * runtimeConfig.getLightSourceOrbitSpeed();
    }

    private void distributeSourceAngles(SimulationWorld world) {
        int count = world.getLightSources().size();
        if (count == 0) return;

        double startAngle = Math.toRadians(runtimeConfig.getLightSourceStartAngle() - 90.0);
        double step = 2.0 * Math.PI / count;

        for (int i = 0; i < count; i++) {
            world.getLightSources().get(i).setAngle(startAngle + i * step);
        }
    }

    private double clamp(double value, double min, double max) {
        if (max < min) {
            return min;
        }
        return Math.max(min, Math.min(max, value));
    }
}
