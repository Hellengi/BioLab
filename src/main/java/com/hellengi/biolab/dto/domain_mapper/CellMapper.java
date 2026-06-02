package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.physics.Lighting;
import com.hellengi.biolab.dto.CellDisplayDto;
import com.hellengi.biolab.dto.CellDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Maps between {@link Cell} domain objects and {@link CellDto}.
 *
 * localLight is sampled from the light map prepared once in SimulationWorldMapper.
 * CellDisplayDto contains cheap visual-only data for front rendering.
 */
@Component
@RequiredArgsConstructor
public class CellMapper {
    /**
     * Shadow direction is still estimated from the cached light-map gradient.
     * This keeps the previous shadow algorithm unchanged.
     */
    private static final double LIGHT_DIRECTION_RADIUS_FACTOR = 0.85;
    private static final double LIGHT_DIRECTION_MIN_GRID_RADIUS_FACTOR = 0.75;
    private static final double[] LIGHT_DIRECTION_RING_RADIUS_FACTORS = {1.0, 0.55};
    private static final double[] LIGHT_DIRECTION_RING_WEIGHTS = {0.72, 0.28};
    private static final double LIGHT_DIRECTION_VECTOR_EPSILON = 1.0e-9;
    private static final double SHADOW_DARK_SIDE_FADE_START_LIGHT = 1.0;
    private static final double SHADOW_DARK_SIDE_FULL_FADE_LIGHT = 1.5;

    /**
     * Highlight direction is sampled from the light propagation vector map.
     * The vector map stores source -> cell propagation direction, so the visual
     * highlight uses the opposite vector: cell -> dominant source.
     */
    private static final double HIGHLIGHT_DIRECTION_EPSILON = 1.0e-6;
    private static final double HIGHLIGHT_MIN_LOCAL_LIGHT = 1.0e-5;
    private static final double HIGHLIGHT_CLARITY_POWER = 0.85;

    private final YamlConfig config;
    private final GenomeMapper genomeMapper;
    private final CellEventMapper cellEventMapper;
    private final CellMotionMapper cellMotionMapper;
    private final Lighting lighting;

    private double[] cachedLightMap;
    private double[] cachedLightDirXMap;
    private double[] cachedLightDirYMap;
    private int cachedLightCols;
    private int cachedLightRows;
    private int cachedGridStep;
    private double cachedGlobalLight;

    public void useLightMap(double[] lightMap, int cols, int rows, int gridStep) {
        useLightMaps(lightMap, null, null, cols, rows, gridStep, 0.0);
    }

    public void useLightMaps(
            double[] lightMap,
            double[] lightDirXMap,
            double[] lightDirYMap,
            int cols,
            int rows,
            int gridStep,
            double globalLight
    ) {
        this.cachedLightMap = lightMap;
        this.cachedLightDirXMap = lightDirXMap;
        this.cachedLightDirYMap = lightDirYMap;
        this.cachedLightCols = cols;
        this.cachedLightRows = rows;
        this.cachedGridStep = Math.max(1, gridStep);
        this.cachedGlobalLight = Math.max(0.0, globalLight);
    }

    public void clearLightMap() {
        this.cachedLightMap = null;
        this.cachedLightDirXMap = null;
        this.cachedLightDirYMap = null;
        this.cachedLightCols = 0;
        this.cachedLightRows = 0;
        this.cachedGridStep = 0;
        this.cachedGlobalLight = 0.0;
    }

    /**
     * Kept for compatibility with old callers.
     */
    public void prepareLightMap() {
        useLightMaps(
                lighting.getLightMap(),
                lighting.getLightDirXMap(),
                lighting.getLightDirYMap(),
                lighting.getLightGridCols(),
                lighting.getLightGridRows(),
                lighting.getLightGridStep(),
                0.0
        );
    }

    public CellDto toDto(Cell cell) {
        double localLight = samplePreparedLight(cell.getX(), cell.getY());
        CellDisplayDto display = calculateDisplay(cell, localLight);

        return new CellDto(
                cell.getId(),
                cell.getX(),
                cell.getY(),
                cell.getVx(),
                cell.getVy(),
                cell.getEnergy(),
                cell.getRadius(),
                !cell.isAlive(),
                genomeMapper.toDto(cell.getGenome()),
                Math.round(cell.getLifetimeTicks()),
                localLight,
                cell.getMass(),
                cell.getDensity(),
                cellEventMapper.toDtoList(cell.getEvents()),
                cellMotionMapper.toDto(cell),
                display,
                cell.getDirectionAngle()
        );
    }

    public Cell toDomain(CellDto dto) {
        Cell cell = new Cell(dto.id(), config);
        cell.setPosition(dto.x(), dto.y());
        cell.setVelocity(dto.vx(), dto.vy());
        cell.setEnergy(dto.energy());
        cell.setGenome(genomeMapper.toDomain(dto.genome()));
        cell.setAlive(!dto.dead());
        cell.setDirectionAngle(dto.directionAngle());
        cell.setLifetimeTicks(dto.lifetimeTicks());
        cell.setMass(dto.mass());
        cell.setEvents(cellEventMapper.toDomainList(dto.events()));
        return cell;
    }

    private CellDisplayDto calculateDisplay(Cell cell, double localLight) {
        double radius = Math.max(
                cell.getRadius() * LIGHT_DIRECTION_RADIUS_FACTOR,
                cachedGridStep * LIGHT_DIRECTION_MIN_GRID_RADIUS_FACTOR
        );

        LightGradient shadowGradient = estimateLightGradient(cell, radius);
        ShadowVisual shadow = calculateShadowVisual(cell, radius, shadowGradient);
        HighlightVisual highlight = calculateHighlightVisual(cell, localLight);

        return new CellDisplayDto(
                shadow.angleDegrees(),
                shadow.gradient(),
                highlight.angleDegrees(),
                highlight.strength(),
                highlight.clarity()
        );
    }

    private ShadowVisual calculateShadowVisual(Cell cell, double radius, LightGradient gradient) {
        if (gradient.magnitude() <= LIGHT_DIRECTION_VECTOR_EPSILON) {
            return ShadowVisual.none();
        }

        double lightDirectionAngle = Math.atan2(gradient.y(), gradient.x());
        SideLight sideLight = sampleDirectionalSideLight(cell, radius, lightDirectionAngle);
        if (sideLight.contrast() <= LIGHT_DIRECTION_VECTOR_EPSILON) {
            return ShadowVisual.none();
        }

        double darkSideFade = darkSideShadowFade(sideLight.darkSide());
        if (darkSideFade <= LIGHT_DIRECTION_VECTOR_EPSILON) {
            return ShadowVisual.none();
        }

        // Keep the old shadow strength while the dark side is at normal brightness.
        // The previous implementation used max(contrast, gradient magnitude), so do
        // the same and apply only the new over-bright dark-side fade on top.
        double displayGradient = Math.max(sideLight.contrast(), gradient.magnitude()) * darkSideFade;

        if (displayGradient <= LIGHT_DIRECTION_VECTOR_EPSILON) {
            return ShadowVisual.none();
        }

        return new ShadowVisual(
                normalizeDegrees(Math.toDegrees(lightDirectionAngle)),
                displayGradient
        );
    }

    private HighlightVisual calculateHighlightVisual(Cell cell, double localLight) {
        if (cachedLightDirXMap == null || cachedLightDirYMap == null) {
            return HighlightVisual.none();
        }

        double dirX = lighting.sampleScalarMap(
                cachedLightDirXMap,
                cachedLightCols,
                cachedLightRows,
                cachedGridStep,
                cell.getX(),
                cell.getY()
        );
        double dirY = lighting.sampleScalarMap(
                cachedLightDirYMap,
                cachedLightCols,
                cachedLightRows,
                cachedGridStep,
                cell.getX(),
                cell.getY()
        );

        double vectorLength = Math.hypot(dirX, dirY);
        if (vectorLength <= HIGHLIGHT_DIRECTION_EPSILON) {
            return HighlightVisual.none();
        }

        double localSourceLight = Math.max(0.0, localLight - cachedGlobalLight);
        if (localSourceLight <= HIGHLIGHT_MIN_LOCAL_LIGHT) {
            return HighlightVisual.none();
        }

        double clarity = clamp01(vectorLength / Math.max(localSourceLight, HIGHLIGHT_DIRECTION_EPSILON));
        double brightness = clamp01(localSourceLight);
        double strength = clamp01(brightness * Math.pow(clarity, HIGHLIGHT_CLARITY_POWER));

        if (strength <= HIGHLIGHT_MIN_LOCAL_LIGHT) {
            return HighlightVisual.none();
        }

        // dir map is source -> cell. Highlight needs cell -> source, so reverse it.
        double highlightAngle = Math.atan2(-dirY, -dirX);

        return new HighlightVisual(
                normalizeDegrees(Math.toDegrees(highlightAngle)),
                strength,
                clarity
        );
    }

    /**
     * Uses a continuous Sobel-like vector instead of picking one of several
     * discrete directions. It is both smoother and cheaper than the old
     * coarse-sector + refinement search: 16 cached samples instead of ~26.
     */
    private LightGradient estimateLightGradient(Cell cell, double radius) {
        double gradientX = 0.0;
        double gradientY = 0.0;

        for (int i = 0; i < LIGHT_DIRECTION_RING_RADIUS_FACTORS.length; i++) {
            double ringRadius = radius * LIGHT_DIRECTION_RING_RADIUS_FACTORS[i];
            double weight = LIGHT_DIRECTION_RING_WEIGHTS[i];
            LightGradient ringGradient = estimateRingLightGradient(cell, ringRadius);

            gradientX += ringGradient.x() * weight;
            gradientY += ringGradient.y() * weight;
        }

        return new LightGradient(gradientX, gradientY);
    }

    private LightGradient estimateRingLightGradient(Cell cell, double radius) {
        double diagonal = radius * Math.sqrt(0.5);
        double cx = cell.getX();
        double cy = cell.getY();

        double north = samplePreparedLight(cx, cy - radius);
        double northEast = samplePreparedLight(cx + diagonal, cy - diagonal);
        double east = samplePreparedLight(cx + radius, cy);
        double southEast = samplePreparedLight(cx + diagonal, cy + diagonal);
        double south = samplePreparedLight(cx, cy + radius);
        double southWest = samplePreparedLight(cx - diagonal, cy + diagonal);
        double west = samplePreparedLight(cx - radius, cy);
        double northWest = samplePreparedLight(cx - diagonal, cy - diagonal);

        double gradientX = ((northEast + 2.0 * east + southEast)
                - (northWest + 2.0 * west + southWest)) / 4.0;
        double gradientY = ((southWest + 2.0 * south + southEast)
                - (northWest + 2.0 * north + northEast)) / 4.0;

        return new LightGradient(gradientX, gradientY);
    }

    private SideLight sampleDirectionalSideLight(Cell cell, double radius, double angle) {
        double dx = Math.cos(angle) * radius;
        double dy = Math.sin(angle) * radius;

        double litSide = samplePreparedLight(cell.getX() + dx, cell.getY() + dy);
        double darkSide = samplePreparedLight(cell.getX() - dx, cell.getY() - dy);

        return new SideLight(litSide, darkSide);
    }

    private double darkSideShadowFade(double darkSideLight) {
        // Up to 100% light on the shadow side, keep the old shadow behavior:
        // shadow strength depends only on lit-side/dark-side contrast.
        if (darkSideLight <= SHADOW_DARK_SIDE_FADE_START_LIGHT) {
            return 1.0;
        }

        // Above 150% light on the shadow side, the cell is so brightly lit that
        // a visible dark-side shadow looks wrong, so fade it out completely.
        if (darkSideLight >= SHADOW_DARK_SIDE_FULL_FADE_LIGHT) {
            return 0.0;
        }

        double t = clamp01((darkSideLight - SHADOW_DARK_SIDE_FADE_START_LIGHT)
                / Math.max(
                        LIGHT_DIRECTION_VECTOR_EPSILON,
                        SHADOW_DARK_SIDE_FULL_FADE_LIGHT - SHADOW_DARK_SIDE_FADE_START_LIGHT
                ));
        return 1.0 - smoothstep(t);
    }

    private double smoothstep(double value) {
        double t = clamp01(value);
        return t * t * (3.0 - 2.0 * t);
    }

    private record SideLight(double litSide, double darkSide) {
        double contrast() {
            return Math.max(0.0, litSide - darkSide);
        }
    }

    private record LightGradient(double x, double y) {
        double magnitude() {
            return Math.hypot(x, y);
        }
    }

    private record ShadowVisual(Double angleDegrees, Double gradient) {
        static ShadowVisual none() {
            return new ShadowVisual(null, null);
        }
    }

    private record HighlightVisual(Double angleDegrees, Double strength, Double clarity) {
        static HighlightVisual none() {
            return new HighlightVisual(null, null, null);
        }
    }

    private double normalizeDegrees(double degrees) {
        double value = degrees % 360.0;
        return value < 0.0 ? value + 360.0 : value;
    }

    private double samplePreparedLight(double x, double y) {
        if (cachedLightMap != null) {
            return lighting.sampleLightMap(
                    cachedLightMap,
                    cachedLightCols,
                    cachedLightRows,
                    cachedGridStep,
                    x,
                    y
            );
        }

        return lighting.sampleLightAt(x, y);
    }

    private double clamp01(double value) {
        if (!Double.isFinite(value)) {
            return 0.0;
        }
        return Math.max(0.0, Math.min(1.0, value));
    }
}
