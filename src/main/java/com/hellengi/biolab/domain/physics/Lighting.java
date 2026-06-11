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

import static com.hellengi.biolab.util.Utils.clamp01;

/**
 * Lighting system with three grid-space maps:
 *
 * Pipeline:
 *   1. buildOpacityMap() rasterizes cells + turbidity into the optical-density grid.
 *   2. traceDirectedLight() casts external-source rays through that grid and fills
 *      directedLightMap plus direction vectors.
 *   3. A configurable part of directed-light extinction is deposited into a
 *      grid scatter budget instead of being destroyed.
 *   4. Bioluminescent cells pay metabolic energy and deposit emitted light into
 *      the same scatter budget.
 *   5. Scattered light is transported by a fast conservative square-grid diffusion
 *      pass. The total light map remains directedLightMap + scatteredLightMap.
 */
@Component
@RequiredArgsConstructor
public class Lighting {

    /**
     * Area-light sampling makes shadows soft without blurring the final light map.
     * Keep the original high ray density: performance is optimized below by
     * merging only touched grid cells instead of lowering visual quality.
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
    private static final double BIOLUMINESCENT_SOURCE_MIN_BRIGHTNESS = 1.0e-4;
    private static final double SCATTER_DEPOSIT_EPSILON = 1.0e-8;
    private static final double SCATTER_DIFFUSION_SHARE = 0.34;
    private static final double SCATTER_OPACITY_ABSORPTION = 0.045;

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
    private double[] cachedDirectedLightMap;
    private double[] cachedScatteredLightMap;
    private double[] cachedLightDirXMap;
    private double[] cachedLightDirYMap;
    private double[] cachedOpacityMap;
    private int cachedGridStep;
    private int cachedCols;
    private int cachedRows;
    private boolean lightCacheDirty = true;

    private double[] cachedMetabolicScatteredLightMap;
    private int cachedMetabolicGridStep;
    private int cachedMetabolicCols;
    private int cachedMetabolicRows;
    private boolean metabolicScatterCacheDirty = true;

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
        metabolicScatterCacheDirty = true;
    }

    public double[] getLightMap() {
        ensureLightCache();
        return cachedLightMap;
    }

    public double[] getDirectedLightMap() {
        ensureLightCache();
        return cachedDirectedLightMap;
    }

    public double[] getScatteredLightMap() {
        ensureLightCache();
        return cachedScatteredLightMap;
    }

    public double[] getOpacityMap() {
        ensureLightCache();
        return cachedOpacityMap;
    }


    public double[] getLightDirXMap() {
        ensureLightCache();
        return cachedLightDirXMap;
    }

    public double[] getLightDirYMap() {
        ensureLightCache();
        return cachedLightDirYMap;
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

    public double sampleMetabolicLightAt(double x, double y) {
        // Critical performance path: Lifecycle calls this once per living cell on every
        // simulation tick. Do not call ensureLightCache() here, because the visual
        // ray-traced maps are intentionally much more expensive and are needed only
        // for rendering/debug layers. This keeps metabolism close to the original
        // cheap approximation while still letting bioluminescence contribute through
        // a lightweight square-grid scattered-light cache.
        double light = sampleFastDirectedMetabolicLightAt(x, y);
        light += sampleFastMetabolicScatteredLightAt(x, y);
        return Math.max(0.0, light);
    }

    private double sampleFastDirectedMetabolicLightAt(double x, double y) {
        double light = Math.max(0.0, world.getGlobalLight().getValue());
        if (world.getLightSources().isEmpty()) {
            return light;
        }

        double centerX = config.worldCenterX();
        double centerY = config.worldCenterY();
        double r0 = Math.max(1.0, config.getLight().getFalloffFactor());
        double r0sq = r0 * r0;
        double turbidity = Math.max(0.0, runtimeConfig.getTurbidityAttenuation());

        for (LightSource source : world.getLightSources()) {
            double brightness = Math.max(0.0, source.getBrightness());
            if (brightness <= 0.0) {
                continue;
            }

            double dx = x - source.getX(centerX);
            double dy = y - source.getY(centerY);
            double distSq = dx * dx + dy * dy;
            double distance = Math.sqrt(distSq);
            double falloff = r0sq / (distSq + r0sq);
            double mediumTransmittance = Math.exp(-turbidity * distance);
            light += brightness * falloff * mediumTransmittance;
        }

        return light;
    }

    private double sampleFastMetabolicScatteredLightAt(double x, double y) {
        ensureMetabolicScatteredLightCache();
        if (cachedMetabolicScatteredLightMap == null || cachedMetabolicScatteredLightMap.length == 0) {
            return 0.0;
        }
        return Math.max(0.0, sampleScalarMap(
                cachedMetabolicScatteredLightMap,
                cachedMetabolicCols,
                cachedMetabolicRows,
                cachedMetabolicGridStep,
                x,
                y
        ));
    }

    private void ensureMetabolicScatteredLightCache() {
        int diameter = config.getTubeDiameter();
        int gridStep = Math.max(1, config.getLight().getGridStep());
        int cols = (int) Math.ceil(diameter / (double) gridStep);
        int rows = (int) Math.ceil(diameter / (double) gridStep);

        boolean geometryChanged = cachedMetabolicScatteredLightMap == null
                || cachedMetabolicGridStep != gridStep
                || cachedMetabolicCols != cols
                || cachedMetabolicRows != rows;

        if (!metabolicScatterCacheDirty && !geometryChanged) {
            return;
        }

        cachedMetabolicGridStep = gridStep;
        cachedMetabolicCols = cols;
        cachedMetabolicRows = rows;

        double[] scatterDepositMap = new double[cols * rows];
        double[] scatteredMap = new double[cols * rows];
        double[] opacityMap = buildTurbidityOnlyOpacityMap(diameter, diameter, gridStep, cols, rows);

        boolean hasBioluminescentEmission = accumulateClusteredBioluminescentEmission(
                scatterDepositMap,
                cols,
                rows,
                gridStep,
                diameter,
                diameter
        );
        if (hasBioluminescentEmission) {
            spreadScatteredLight(scatterDepositMap, scatteredMap, opacityMap, cols, rows, gridStep);
        }
        cachedMetabolicScatteredLightMap = scatteredMap;
        metabolicScatterCacheDirty = false;
    }

    private double[] buildTurbidityOnlyOpacityMap(int width, int height, int gridStep, int cols, int rows) {
        double[] opacityMap = new double[cols * rows];
        double turbidityPerGridCell = runtimeConfig.getTurbidityAttenuation() * Math.max(1, gridStep);
        if (turbidityPerGridCell > 0.0) {
            Arrays.fill(opacityMap, turbidityPerGridCell);
        }
        return opacityMap;
    }

    public LightDirectionSample sampleLightDirectionAt(double x, double y) {
        ensureLightCache();
        double dirX = sampleScalarMap(cachedLightDirXMap, cachedCols, cachedRows, cachedGridStep, x, y);
        double dirY = sampleScalarMap(cachedLightDirYMap, cachedCols, cachedRows, cachedGridStep, x, y);
        return new LightDirectionSample(dirX, dirY);
    }

    private void ensureLightCache() {
        int diameter = config.getTubeDiameter();
        int gridStep = Math.max(1, config.getLight().getGridStep());
        int cols = (int) Math.ceil(diameter / (double) gridStep);
        int rows = (int) Math.ceil(diameter / (double) gridStep);

        boolean geometryChanged = cachedLightMap == null
                || cachedDirectedLightMap == null
                || cachedScatteredLightMap == null
                || cachedLightDirXMap == null
                || cachedLightDirYMap == null
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
        LightMapBuildResult result = buildLightMapFromOpacityMap(
                diameter,
                diameter,
                gridStep,
                cols,
                rows,
                cachedOpacityMap
        );
        cachedLightMap = result.lightMap();
        cachedDirectedLightMap = result.directedLightMap();
        cachedScatteredLightMap = result.scatteredLightMap();
        cachedLightDirXMap = result.dirXMap();
        cachedLightDirYMap = result.dirYMap();
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
        return buildLightMapFromOpacityMap(width, height, safeGridStep, cols, rows, opacityMap).lightMap();
    }

    public double sampleLightMap(double[] lightMap, int cols, int rows,
                                 int gridStep, double wx, double wy) {
        if (lightMap == null || lightMap.length == 0 || cols <= 0 || rows <= 0) {
            return world.getGlobalLight().getValue();
        }

        return Math.max(0.0, sampleScalarMap(lightMap, cols, rows, gridStep, wx, wy));
    }

    public double sampleScalarMap(double[] map, int cols, int rows,
                                  int gridStep, double wx, double wy) {
        if (map == null || map.length == 0 || cols <= 0 || rows <= 0) {
            return 0.0;
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

        double v00 = map[row0 * cols + col0];
        double v10 = map[row0 * cols + col1];
        double v01 = map[row1 * cols + col0];
        double v11 = map[row1 * cols + col1];

        double top    = v00 + (v10 - v00) * tx;
        double bottom = v01 + (v11 - v01) * tx;
        return top + (bottom - top) * ty;
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private LightMapBuildResult buildLightMapFromOpacityMap(
            int width,
            int height,
            int gridStep,
            int cols,
            int rows,
            double[] opacityMap
    ) {
        double[] directedLightMap = new double[cols * rows];
        double[] scatteredLightMap = new double[cols * rows];
        double[] scatterDepositMap = new double[cols * rows];
        double[] lightMap = new double[cols * rows];
        double[] dirXMap = new double[cols * rows];
        double[] dirYMap = new double[cols * rows];

        double ambient = world.getGlobalLight().getValue();
        Arrays.fill(directedLightMap, ambient);

        boolean hasRuntimeSources = !world.getLightSources().isEmpty();
        boolean hasBioluminescentCells = world.getCells().stream()
                .anyMatch(cell -> cell.getBioluminescenceBrightness() > BIOLUMINESCENT_SOURCE_MIN_BRIGHTNESS);

        double centerX = config.worldCenterX();
        double centerY = config.worldCenterY();
        double r0 = Math.max(1.0, config.getLight().getFalloffFactor());
        double r0sq = r0 * r0;

        int rayCount = rayCountFor(cols, rows);
        double scatteringAlbedo = clamp01(config.getLight().getScatteringAlbedo());

        if (hasRuntimeSources) {
            for (LightSource source : world.getLightSources()) {
                accumulateAreaLight(
                        directedLightMap,
                        dirXMap,
                        dirYMap,
                        scatterDepositMap,
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
                        rayCount,
                        scatteringAlbedo
                );
            }
        }

        if (hasBioluminescentCells) {
            accumulateClusteredBioluminescentEmission(
                    scatterDepositMap,
                    cols,
                    rows,
                    gridStep,
                    width,
                    height
            );
        }

        if (hasScatteredLightDeposit(scatterDepositMap)) {
            spreadScatteredLight(scatterDepositMap, scatteredLightMap, opacityMap, cols, rows, gridStep);
        }

        for (int i = 0; i < lightMap.length; i++) {
            lightMap[i] = directedLightMap[i] + scatteredLightMap[i];
        }

        return new LightMapBuildResult(lightMap, directedLightMap, scatteredLightMap, dirXMap, dirYMap);
    }

    private boolean hasScatteredLightDeposit(double[] scatterDepositMap) {
        for (double value : scatterDepositMap) {
            if (value > SCATTER_DEPOSIT_EPSILON) {
                return true;
            }
        }
        return false;
    }

    private int rayCountFor(int cols, int rows) {
        int edge = Math.max(cols, rows);
        return Math.max(
                MIN_RAYS_PER_SOURCE,
                (int) Math.ceil(2.0 * Math.PI * edge * RAYS_PER_GRID_EDGE_CELL)
        );
    }

    private void accumulateAreaLight(
            double[] directedLightMap,
            double[] dirXMap,
            double[] dirYMap,
            double[] scatterDepositMap,
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
            int baseRayCount,
            double scatteringAlbedo
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

        int rayCount = rayCountForSource(baseRayCount, edgeSource);
        double angleSpan = edgeSource ? Math.PI : 2.0 * Math.PI;
        double startAngle = edgeSource
                ? source.getAngle() + Math.PI - angleSpan * 0.5
                : 0.0;
        double maxRayDistance = Double.POSITIVE_INFINITY;

        double[] virtualSourceMap = new double[cols * rows];
        double[] virtualDirXMap = new double[cols * rows];
        double[] virtualDirYMap = new double[cols * rows];
        double[] virtualScatterDepositMap = new double[cols * rows];
        TouchedGrid touched = new TouchedGrid(cols * rows);

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

            // A tiny per-sample phase shift reduces angular banding without any blur.
            double phaseShift = angleSpan * sampleIndex / (rayCount * samples.length);
            double sampleBrightness = brightness * sample[2];

            for (int i = 0; i < rayCount; i++) {
                double angle = startAngle + phaseShift + angleSpan * (i + 0.5) / rayCount;
                castLightRay(
                        virtualSourceMap,
                        virtualDirXMap,
                        virtualDirYMap,
                        virtualScatterDepositMap,
                        opacityMap,
                        cols,
                        rows,
                        gridStep,
                        sampleX,
                        sampleY,
                        Math.cos(angle),
                        Math.sin(angle),
                        sampleBrightness,
                        r0sq,
                        maxRayDistance,
                        scatteringAlbedo,
                        touched
                );
            }

            for (int n = 0; n < touched.count; n++) {
                int idx = touched.indices[n];
                directedLightMap[idx] += virtualSourceMap[idx];
                dirXMap[idx] += virtualDirXMap[idx];
                dirYMap[idx] += virtualDirYMap[idx];
                scatterDepositMap[idx] += virtualScatterDepositMap[idx];
            }
            touched.clear(virtualSourceMap, virtualDirXMap, virtualDirYMap, virtualScatterDepositMap);
        }
    }

    private boolean accumulateClusteredBioluminescentEmission(
            double[] scatterDepositMap,
            int cols,
            int rows,
            int gridStep,
            int width,
            int height
    ) {
        boolean anyEmission = false;
        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) {
                continue;
            }

            double brightness = cell.getBioluminescenceBrightness();
            if (brightness <= BIOLUMINESCENT_SOURCE_MIN_BRIGHTNESS) {
                continue;
            }

            int col = Math.max(0, Math.min(cols - 1, (int) Math.floor(cell.getX() / gridStep)));
            int row = Math.max(0, Math.min(rows - 1, (int) Math.floor(cell.getY() / gridStep)));
            scatterDepositMap[row * cols + col] += brightness;
            anyEmission = true;
        }
        return anyEmission;
    }

    private void spreadScatteredLight(
            double[] scatterDepositMap,
            double[] scatteredLightMap,
            double[] opacityMap,
            int cols,
            int rows,
            int gridStep
    ) {
        int passes = scatteredLightDiffusionPasses();
        double[] current = Arrays.copyOf(scatterDepositMap, scatterDepositMap.length);
        double[] next = new double[current.length];

        for (int pass = 0; pass < passes; pass++) {
            Arrays.fill(next, 0.0);

            for (int row = 0; row < rows; row++) {
                boolean hasNorth = row > 0;
                boolean hasSouth = row + 1 < rows;
                for (int col = 0; col < cols; col++) {
                    int idx = row * cols + col;
                    double value = current[idx];
                    if (value <= SCATTER_DEPOSIT_EPSILON) {
                        continue;
                    }

                    double absorption = clamp01(Math.max(0.0, opacityMap[idx]) * SCATTER_OPACITY_ABSORPTION);
                    double afterAbsorption = value * (1.0 - absorption);
                    double spread = afterAbsorption * SCATTER_DIFFUSION_SHARE;
                    double retained = afterAbsorption - spread;
                    next[idx] += retained;

                    boolean hasWest = col > 0;
                    boolean hasEast = col + 1 < cols;
                    int neighborCount = 0;
                    if (hasNorth) neighborCount += hasWest && hasEast ? 3 : (hasWest || hasEast ? 2 : 1);
                    if (hasSouth) neighborCount += hasWest && hasEast ? 3 : (hasWest || hasEast ? 2 : 1);
                    if (hasWest) neighborCount++;
                    if (hasEast) neighborCount++;

                    if (neighborCount <= 0) {
                        next[idx] += spread;
                        continue;
                    }

                    double share = spread / neighborCount;
                    int north = idx - cols;
                    int south = idx + cols;

                    if (hasNorth) {
                        next[north] += share;
                        if (hasWest) next[north - 1] += share;
                        if (hasEast) next[north + 1] += share;
                    }
                    if (hasWest) next[idx - 1] += share;
                    if (hasEast) next[idx + 1] += share;
                    if (hasSouth) {
                        next[south] += share;
                        if (hasWest) next[south - 1] += share;
                        if (hasEast) next[south + 1] += share;
                    }
                }
            }

            double[] tmp = current;
            current = next;
            next = tmp;
        }

        System.arraycopy(current, 0, scatteredLightMap, 0, scatteredLightMap.length);
    }

    private int scatteredLightDiffusionPasses() {
        double radiusCells = Math.max(0.0, config.getLight().getScatteredLightRadiusGridCells());
        return Math.max(1, Math.min(24, (int) Math.ceil(radiusCells)));
    }

    private int rayCountForSource(int baseRayCount, boolean edgeSource) {
        return edgeSource
                ? Math.max(MIN_RAYS_PER_SOURCE / 2, baseRayCount / 2)
                : baseRayCount;
    }

    private boolean isEdgeSource(LightSource source) {
        return Math.abs(source.getOrbitRadius() - config.worldRadius()) < EDGE_SOURCE_RADIUS_EPSILON;
    }

    private void castLightRay(
            double[] sourceMap,
            double[] sourceDirXMap,
            double[] sourceDirYMap,
            double[] scatterDepositMap,
            double[] opacityMap,
            int cols,
            int rows,
            int gridStep,
            double sx,
            double sy,
            double dirX,
            double dirY,
            double brightness,
            double r0sq,
            double maxDistance,
            double scatteringAlbedo,
            TouchedGrid touched
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

        double maxRayDistance = Double.isFinite(maxDistance)
                ? Math.max(0.0, maxDistance)
                : Double.POSITIVE_INFINITY;

        int safety = cols + rows + 4;
        while (col >= 0 && col < cols && row >= 0 && row < rows
                && currentT <= maxRayDistance
                && safety-- > 0) {
            double nextT = Math.min(Math.min(tMaxX, tMaxY), maxRayDistance);
            if (nextT < currentT) {
                break;
            }

            double segmentLength = Math.max(0.0, nextT - currentT);
            double sampleT = currentT + segmentLength * 0.5;
            int idx = row * cols + col;

            double transmittance = Math.exp(-Math.min(MAX_OPTICAL_DEPTH, opticalDepth));
            double falloff = r0sq / (sampleT * sampleT + r0sq);
            double contribution = brightness * falloff * transmittance;

            // Several rays can hit the same grid cell. Keep max per source, not sum,
            // otherwise brightness depends on ray density.
            if (contribution > sourceMap[idx]) {
                touched.mark(idx);
                sourceMap[idx] = contribution;
                sourceDirXMap[idx] = contribution * dirX;
                sourceDirYMap[idx] = contribution * dirY;
            }

            if (segmentLength > 0.0 && scatteringAlbedo > 0.0) {
                double segmentDepth = Math.max(0.0, opacityMap[idx]) * (segmentLength / gridStep);
                if (segmentDepth > 0.0) {
                    double nextOpticalDepth = opticalDepth + segmentDepth;
                    double nextTransmittance = Math.exp(-Math.min(MAX_OPTICAL_DEPTH, nextOpticalDepth));
                    double lostLight = brightness * falloff * Math.max(0.0, transmittance - nextTransmittance);
                    double scattered = lostLight * scatteringAlbedo;
                    if (scattered > scatterDepositMap[idx]) {
                        touched.mark(idx);
                        scatterDepositMap[idx] = scattered;
                    }
                    opticalDepth = nextOpticalDepth;
                }
            } else {
                opticalDepth += Math.max(0.0, opacityMap[idx]) * (segmentLength / gridStep);
            }

            if (opticalDepth >= MAX_OPTICAL_DEPTH) {
                break;
            }

            currentT = nextT;
            if (currentT >= maxRayDistance) {
                break;
            }

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

    private static final class TouchedGrid {
        private final boolean[] touched;
        private final int[] indices;
        private int count;

        private TouchedGrid(int size) {
            this.touched = new boolean[size];
            this.indices = new int[size];
        }

        private void mark(int idx) {
            if (!touched[idx]) {
                touched[idx] = true;
                indices[count++] = idx;
            }
        }

        private void clear(
                double[] sourceMap,
                double[] dirXMap,
                double[] dirYMap,
                double[] scatterDepositMap
        ) {
            for (int n = 0; n < count; n++) {
                int idx = indices[n];
                touched[idx] = false;
                sourceMap[idx] = 0.0;
                dirXMap[idx] = 0.0;
                dirYMap[idx] = 0.0;
                scatterDepositMap[idx] = 0.0;
            }
            count = 0;
        }
    }

    private record LightMapBuildResult(
            double[] lightMap,
            double[] directedLightMap,
            double[] scatteredLightMap,
            double[] dirXMap,
            double[] dirYMap
    ) {
    }

    public record LightDirectionSample(double x, double y) {
        public double magnitude() {
            return Math.hypot(x, y);
        }
    }
}
