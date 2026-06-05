package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.physics.Lighting;
import com.hellengi.biolab.dto.CellDto;
import com.hellengi.biolab.dto.CellVisualDto;
import com.hellengi.biolab.dto.DisplayLayersDto;
import com.hellengi.biolab.dto.RgbColorDto;
import com.hellengi.biolab.dto.LysosomeSlotDto;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import static com.hellengi.biolab.util.Utils.clamp01;

@Component
@RequiredArgsConstructor
public class CellMapper {
    private static final double LIGHT_DIRECTION_RADIUS_FACTOR = 0.85;
    private static final double LIGHT_DIRECTION_MIN_GRID_RADIUS_FACTOR = 0.75;
    private static final double[] LIGHT_DIRECTION_RING_RADIUS_FACTORS = {1.0, 0.55};
    private static final double[] LIGHT_DIRECTION_RING_WEIGHTS = {0.72, 0.28};
    private static final double LIGHT_DIRECTION_VECTOR_EPSILON = 1.0e-9;
    private static final double SHADOW_DARK_SIDE_FADE_START_LIGHT = 1.0;
    private static final double SHADOW_DARK_SIDE_FULL_FADE_LIGHT = 1.5;
    private static final double HIGHLIGHT_DIRECTION_EPSILON = 1.0e-6;
    private static final double HIGHLIGHT_MIN_LOCAL_LIGHT = 1.0e-5;
    private static final double HIGHLIGHT_CLARITY_POWER = 0.85;

    private static final RgbColorDto NUCLEOID_COLOR = new RgbColorDto(104, 92, 138, 0.84);
    private static final RgbColorDto CYTOSOL_COLOR = new RgbColorDto(200, 194, 170, 0.36);
    private static final RgbColorDto MEMBRANE_BASE_COLOR = new RgbColorDto(218, 203, 174, 0.095);
    private static final RgbColorDto MELANIN_COLOR = new RgbColorDto(65, 43, 30, 1.0);
    private static final RgbColorDto CHLOROPHYLL_LOW_COLOR = new RgbColorDto(154, 210, 82, 0.74);
    private static final RgbColorDto CHLOROPHYLL_HIGH_COLOR = new RgbColorDto(28, 96, 40, 0.74);
    private static final RgbColorDto CAROTENOID_COLOR = new RgbColorDto(128, 72, 32, 0.74);
    private static final RgbColorDto CHLOROPLAST_BLEACHED_COLOR = new RgbColorDto(238, 240, 232, 0.74);
    private static final RgbColorDto LYSOSOME_COLOR = new RgbColorDto(104, 31, 47, 0.72);
    private static final RgbColorDto LYSOSOME_GLOW_COLOR = new RgbColorDto(218, 224, 74, 0.0);
    private static final RgbColorDto GFP_COLOR = new RgbColorDto(83, 255, 139, 1.0);
    private static final RgbColorDto DAMAGE_COLOR = new RgbColorDto(96, 88, 76, 1.0);

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


    public CellDto toDto(Cell cell) {
        return toDto(cell, DisplayLayersDto.off());
    }

    public CellDto toSnapshotDto(Cell cell) {
        return toDto(cell, null);
    }

    public CellDto toDto(Cell cell, DisplayLayersDto viewState) {
        if (!cell.hasInternalLayoutInitialized()) {
            cell.ensureInternalLayoutInitialized();
        }
        double localLight = samplePreparedLight(cell.getX(), cell.getY());
        CellVisualDto visual = calculateVisual(cell);
        boolean includeForces = viewState == null || viewState.selectedForcesEnabled(cell.getId());

        return new CellDto(
                cell.getId(),
                cell.getX(),
                cell.getY(),
                cell.getVx(),
                cell.getVy(),
                cell.getEnergy(),
                cell.getRadius(),
                cell.getNucleusLayoutX(),
                cell.getNucleusLayoutY(),
                cell.getNucleusRadius(),
                cell.getNucleusLayoutTargetX(),
                cell.getNucleusLayoutTargetY(),
                !cell.isAlive(),
                genomeMapper.toDto(cell.getGenome()),
                Math.round(cell.getLifetimeTicks()),
                localLight,
                cell.getMass(),
                cell.getDensity(),
                cell.getOpacity(),
                cell.getCellDamage(),
                cell.getCpDamage(),
                cell.getLysosomeDamage(),
                cell.getLastEnergyProduction(),
                cell.getLastDigestionEnergyProduction(),
                cell.getLastEnergyConsumption() + cell.getLastDigestionEnergyCostRate(),
                cell.getLastDigestionEnergyCostRate(),
                cell.getLastCpPhotoDamageRate(),
                cell.getLastCellDamageRate(),
                cell.getLastLysosomeDamageRate(),
                cell.getLastCpRepairRate(),
                cell.getLastCellRepairRate(),
                cell.getLastLysosomeRepairRate(),
                cell.getLastRepairEnergyCostRate(),
                cell.getLastLysosomeRepairEnergyCostRate(),
                cell.getCarotProtection(),
                cell.getMembraneLightTransmittance(),
                cell.getLysosomeCapacity(),
                cell.getOccupiedLysosomeSlots(),
                lysosomeSlotsToDto(cell),
                includeForces ? cellEventMapper.toDtoList(cell.getEvents()) : null,
                includeForces ? cellMotionMapper.toDto(cell) : null,
                visual,
                cell.getDirectionAngle()
        );
    }

    public Cell toDomain(CellDto dto) {
        Cell cell = new Cell(dto.id(), config);
        cell.setPosition(dto.x(), dto.y());
        cell.setVelocity(dto.vx(), dto.vy());
        cell.setEnergy(dto.energy());
        cell.setGenome(genomeMapper.toDomain(dto.genome()));
        cell.setNucleusLayoutX(dto.nucleusOffsetX());
        cell.setNucleusLayoutY(dto.nucleusOffsetY());
        cell.setNucleusLayoutTargetX(dto.nucleusTargetOffsetX());
        cell.setNucleusLayoutTargetY(dto.nucleusTargetOffsetY());
        cell.setAlive(!dto.dead());
        cell.setDirectionAngle(dto.directionAngle());
        cell.setLifetimeTicks(dto.lifetimeTicks());
        cell.setMass(dto.mass());
        cell.setCellDamage(dto.cellDamage());
        cell.setCpDamage(dto.cpDamage());
        cell.setLastEnergyProduction(dto.energyProduction());
        cell.setLastDigestionEnergyProduction(dto.digestionEnergyProduction());
        cell.setLastEnergyConsumption(dto.energyConsumption() - dto.digestionEnergyCostRate());
        cell.setLastDigestionEnergyCostRate(dto.digestionEnergyCostRate());
        cell.setLastCpPhotoDamageRate(dto.cpPhotoDamageRate());
        cell.setLastCellDamageRate(dto.cellDamageRate());
        cell.setLastLysosomeDamageRate(dto.lysosomeDamageRate());
        cell.setLastCpRepairRate(dto.cpRepairRate());
        cell.setLastCellRepairRate(dto.cellRepairRate());
        cell.setLastLysosomeRepairRate(dto.lysosomeRepairRate());
        cell.setLastRepairEnergyCostRate(dto.repairEnergyCostRate());
        cell.setLastLysosomeRepairEnergyCostRate(dto.lysosomeRepairEnergyCostRate());
        cell.setLysosomeSlots(lysosomeSlotsToDomain(dto.lysosomeSlots()));
        cell.setEvents(cellEventMapper.toDomainList(dto.events()));
        cell.ensureInternalLayoutInitialized();
        return cell;
    }

    private List<LysosomeSlotDto> lysosomeSlotsToDto(Cell cell) {
        return cell.getLysosomeSlots().stream()
                .map(slot -> new LysosomeSlotDto(
                        slot.getIndex(),
                        slot.getFoodId(),
                        slot.getDamage(),
                        slot.isOccupied(),
                        slot.performance(),
                        slot.getFoodEnergy(),
                        slot.getFoodRadius(),
                        slot.isFoodInsideLysosome(),
                        slot.getTargetFoodRadius(),
                        slot.getLayoutX(),
                        slot.getLayoutY(),
                        slot.getLayoutRadius(),
                        slot.getLayoutRotation(),
                        slot.getTargetLayoutX(),
                        slot.getTargetLayoutY(),
                        slot.getTargetLayoutRadius(),
                        slot.getTargetLayoutRotation(),
                        slot.getLastEnergyProductionRate(),
                        slot.getLastEnergyCostRate(),
                        slot.getLastDamageRate(),
                        slot.getLastRepairRate(),
                        slot.getLastRepairEnergyCostRate()
                ))
                .toList();
    }

    private List<com.hellengi.biolab.domain.model.LysosomeSlot> lysosomeSlotsToDomain(List<LysosomeSlotDto> slots) {
        if (slots == null) return List.of();
        return slots.stream()
                .map(slot -> {
                    com.hellengi.biolab.domain.model.LysosomeSlot domainSlot = new com.hellengi.biolab.domain.model.LysosomeSlot(slot.index(), slot.foodId(), slot.damage());
                    domainSlot.setFoodEnergy(slot.foodEnergy());
                    domainSlot.setFoodRadius(slot.foodRadius());
                    domainSlot.setFoodInsideLysosome(slot.foodInsideLysosome());
                    domainSlot.setTargetFoodRadius(slot.targetFoodRadius());
                    domainSlot.setLayout(slot.layoutX(), slot.layoutY(), slot.layoutRadius(), slot.layoutRotation());
                    domainSlot.setTargetLayout(slot.targetLayoutX(), slot.targetLayoutY(), slot.targetLayoutRadius(), slot.targetLayoutRotation());
                    domainSlot.setLastEnergyProductionRate(slot.energyProductionRate());
                    domainSlot.setLastEnergyCostRate(slot.energyCostRate());
                    domainSlot.setLastDamageRate(slot.damageRate());
                    domainSlot.setLastRepairRate(slot.repairRate());
                    domainSlot.setLastRepairEnergyCostRate(slot.repairEnergyCostRate());
                    return domainSlot;
                })
                .toList();
    }

    private CellVisualDto calculateVisual(Cell cell) {
        double cellDiameter = Math.max(cell.getRadius() * 2.0, 1.0e-9);
        double cytosolColorNormalizer = cellDiameter;
        double cpAreaShare = cell.hasChloroplasts()
                ? clamp01(cell.getCpTotalArea() / cytosolColorNormalizer)
                : 0.0;
        double lysosomeEnzyme = cell.getLysosomeEnzymeActivity01();
        double lysosomeAreaShare = cell.hasLysosomes()
                ? clamp01(cell.getLysosomeTotalArea() / cytosolColorNormalizer)
                : 0.0;

        double chlorophyll = cell.hasChloroplasts() ? cell.getChlorophyll01() : 0.0;
        double chlorophyllRange = clamp01((chlorophyll - 0.15) / 0.85);
        double carotenoids = cell.hasChloroplasts() ? cell.getCarotenoids01() : 0.0;
        double pigmentPresence = clamp01(Math.max(chlorophyll, carotenoids));
        double cpColorInfluence = cpAreaShare * (0.80 + 0.70 * pigmentPresence);

        double cpDamageWeight = clamp01(cell.getCpDamage() * 0.5);
        double lysosomeDamageWeight = clamp01(cell.getLysosomeDamage());
        double cellDamageWeight = clamp01(cell.getCellDamage());
        double cytosolDamageWeight = cell.isAlive()
                ? Math.pow(cellDamageWeight, 0.62) * 3.25 + lysosomeDamageWeight * 0.18
                : Math.max(7.5, Math.pow(cellDamageWeight, 0.62) * 3.25) + lysosomeDamageWeight * 0.18;

        RgbColorDto chlorophyllColor = mix(CHLOROPHYLL_LOW_COLOR, CHLOROPHYLL_HIGH_COLOR, chlorophyllRange);
        RgbColorDto chloroplastPigmentColor = mixWeighted(
                chlorophyllColor, Math.max(0.001, chlorophyll),
                CAROTENOID_COLOR, carotenoids,
                CHLOROPLAST_BLEACHED_COLOR, 0.0
        );
        RgbColorDto chloroplastColor = mix(chloroplastPigmentColor, CHLOROPLAST_BLEACHED_COLOR, cpDamageWeight);

        RgbColorDto activeLysosomeColor = lysosomeAcidColor(lysosomeEnzyme);
        double lysosomeColorInfluence = lysosomeAreaShare * (0.35 + 0.65 * lysosomeEnzyme);
        RgbColorDto lysosomeColor = withOpacity(
                mix(activeLysosomeColor, DAMAGE_COLOR, lysosomeDamageWeight * 0.72),
                cell.hasLysosomes() ? LYSOSOME_COLOR.opacity() * (1.0 - lysosomeDamageWeight * 0.42) : 0.0
        );

        // CellColor is now the cytosol color itself. Organelles still contribute by
        // their own area, but the cell-side normalizer is the physical cell diameter,
        // not the full cell area. The membrane only has its own membrane layer and no
        // longer contributes to the displayed Cell/Cytosol color.
        RgbColorDto cytosolColor = mixWeighted(
                CYTOSOL_COLOR, config.getCell().getCytosolColorWeight(),
                chloroplastColor, cpColorInfluence,
                lysosomeColor, lysosomeColorInfluence,
                DAMAGE_COLOR, cytosolDamageWeight
        );

        RgbColorDto cellColor = withOpacity(cytosolColor, cell.getCytosolOpacity());

        double lysosomeGlowStrength = 0.0;

        double melaninVisibility = cell.getGenome() != null && cell.getGenome().isMelaninEnabled() ? cell.getMelanin01() : 0.0;
        RgbColorDto membraneColor = mix(MEMBRANE_BASE_COLOR, MELANIN_COLOR, melaninVisibility);
        RgbColorDto nucleoidColor = withOpacity(
                mix(NUCLEOID_COLOR, DAMAGE_COLOR, cellDamageWeight * 0.42),
                NUCLEOID_COLOR.opacity() * (1.0 - cellDamageWeight * 0.28)
        );

        DisplayValues display = calculateDisplay(cell, samplePreparedLight(cell.getX(), cell.getY()));
        return new CellVisualDto(
                cellColor,
                withOpacity(membraneColor, cell.getMembraneOpacity()),
                nucleoidColor,
                withOpacity(cytosolColor, cell.getCytosolOpacity()),
                withOpacity(chloroplastColor, cell.hasChloroplasts() ? clamp01(0.34 + 0.66 * pigmentPresence) : 0.0),
                (int) Math.round(cell.getCpAmount()),
                lysosomeColor,
                cell.getLysosomeAmount(),
                LYSOSOME_GLOW_COLOR,
                lysosomeGlowStrength,
                GFP_COLOR,
                cell.getGfp01(),
                display.lightDirectionAngle(),
                display.lightGradient(),
                display.highlightDirectionAngle(),
                display.highlightStrength(),
                display.highlightClarity()
        );
    }

    private DisplayValues calculateDisplay(Cell cell, double localLight) {
        double radius = Math.max(
                cell.getRadius() * LIGHT_DIRECTION_RADIUS_FACTOR,
                cachedGridStep * LIGHT_DIRECTION_MIN_GRID_RADIUS_FACTOR
        );

        HighlightVisual highlight = calculateHighlightVisual(cell, localLight);
        ShadowVisual shadow = calculateShadowVisual(cell, radius);

        return new DisplayValues(
                shadow.angleDegrees(),
                shadow.gradient(),
                highlight.angleDegrees(),
                highlight.strength(),
                highlight.clarity()
        );
    }

    private ShadowVisual calculateShadowVisual(Cell cell, double radius) {
        double lightSideAngle = estimateFallbackLightSideAngle(cell, radius);
        if (!Double.isFinite(lightSideAngle)) {
            return ShadowVisual.none();
        }

        SideLight sideLight = sampleDirectionalSideLight(cell, radius, lightSideAngle);
        if (sideLight.contrast() <= LIGHT_DIRECTION_VECTOR_EPSILON) {
            return ShadowVisual.none();
        }

        double darkSideFade = darkSideShadowFade(sideLight.darkSide());
        if (darkSideFade <= LIGHT_DIRECTION_VECTOR_EPSILON) {
            return ShadowVisual.none();
        }

        double displayGradient = sideLight.contrast() * darkSideFade;
        if (displayGradient <= LIGHT_DIRECTION_VECTOR_EPSILON) {
            return ShadowVisual.none();
        }

        return new ShadowVisual(normalizeDegrees(Math.toDegrees(lightSideAngle)), displayGradient);
    }

    private double estimateFallbackLightSideAngle(Cell cell, double radius) {
        LightGradient gradient = estimateLightGradient(cell, radius);
        return gradient.magnitude() <= LIGHT_DIRECTION_VECTOR_EPSILON
                ? Double.NaN
                : Math.atan2(gradient.y(), gradient.x());
    }

    private HighlightVisual calculateHighlightVisual(Cell cell, double localLight) {
        double localSourceLight = Math.max(0.0, localLight - cachedGlobalLight);
        if (localSourceLight <= HIGHLIGHT_MIN_LOCAL_LIGHT) {
            return HighlightVisual.none();
        }
        if (cachedLightDirXMap == null || cachedLightDirYMap == null) {
            return HighlightVisual.none();
        }

        double dirX = lighting.sampleScalarMap(cachedLightDirXMap, cachedLightCols, cachedLightRows, cachedGridStep, cell.getX(), cell.getY());
        double dirY = lighting.sampleScalarMap(cachedLightDirYMap, cachedLightCols, cachedLightRows, cachedGridStep, cell.getX(), cell.getY());

        double vectorLength = Math.hypot(dirX, dirY);
        if (vectorLength <= HIGHLIGHT_DIRECTION_EPSILON) {
            return HighlightVisual.none();
        }

        double clarity = clamp01(vectorLength / Math.max(localSourceLight, HIGHLIGHT_DIRECTION_EPSILON));
        double brightness = clamp01(localSourceLight);
        double strength = clamp01(brightness * Math.pow(clarity, HIGHLIGHT_CLARITY_POWER));

        if (strength <= HIGHLIGHT_MIN_LOCAL_LIGHT) {
            return HighlightVisual.none();
        }

        double highlightAngle = Math.atan2(-dirY, -dirX);
        return new HighlightVisual(normalizeDegrees(Math.toDegrees(highlightAngle)), strength, clarity);
    }

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

        double gradientX = ((northEast + 2.0 * east + southEast) - (northWest + 2.0 * west + southWest)) / 4.0;
        double gradientY = ((southWest + 2.0 * south + southEast) - (northWest + 2.0 * north + northEast)) / 4.0;

        return new LightGradient(gradientX, gradientY);
    }

    private SideLight sampleDirectionalSideLight(Cell cell, double radius, double angle) {
        double dx = Math.cos(angle) * radius;
        double dy = Math.sin(angle) * radius;
        return new SideLight(
                samplePreparedLight(cell.getX() + dx, cell.getY() + dy),
                samplePreparedLight(cell.getX() - dx, cell.getY() - dy)
        );
    }

    private double darkSideShadowFade(double darkSideLight) {
        if (darkSideLight <= SHADOW_DARK_SIDE_FADE_START_LIGHT) return 1.0;
        if (darkSideLight >= SHADOW_DARK_SIDE_FULL_FADE_LIGHT) return 0.0;
        double t = clamp01((darkSideLight - SHADOW_DARK_SIDE_FADE_START_LIGHT)
                / Math.max(LIGHT_DIRECTION_VECTOR_EPSILON, SHADOW_DARK_SIDE_FULL_FADE_LIGHT - SHADOW_DARK_SIDE_FADE_START_LIGHT));
        return 1.0 - smoothstep(t);
    }


    private RgbColorDto lysosomeAcidColor(double enzyme01) {
        double activity = clamp01((clamp01(enzyme01) - 0.15) / 0.85);
        RgbColorDto lowAcid = new RgbColorDto(92, 28, 43, LYSOSOME_COLOR.opacity());
        RgbColorDto midAcid = new RgbColorDto(154, 34, 43, LYSOSOME_COLOR.opacity());
        RgbColorDto highAcid = new RgbColorDto(232, 48, 37, LYSOSOME_COLOR.opacity());
        if (activity < 0.5) {
            return mix(lowAcid, midAcid, activity / 0.5);
        }
        return mix(midAcid, highAcid, (activity - 0.5) / 0.5);
    }

    private RgbColorDto mix(RgbColorDto from, RgbColorDto to, double t) {
        double safeT = clamp01(t);
        return new RgbColorDto(
                (int) Math.round(from.r() + (to.r() - from.r()) * safeT),
                (int) Math.round(from.g() + (to.g() - from.g()) * safeT),
                (int) Math.round(from.b() + (to.b() - from.b()) * safeT),
                from.opacity() + (to.opacity() - from.opacity()) * safeT
        );
    }

    private RgbColorDto mixWeighted(RgbColorDto a, double aw, RgbColorDto b, double bw, RgbColorDto c, double cw) {
        double sum = Math.max(0.001, aw + bw + cw);
        return new RgbColorDto(
                (int) Math.round((a.r() * aw + b.r() * bw + c.r() * cw) / sum),
                (int) Math.round((a.g() * aw + b.g() * bw + c.g() * cw) / sum),
                (int) Math.round((a.b() * aw + b.b() * bw + c.b() * cw) / sum),
                (a.opacity() * aw + b.opacity() * bw + c.opacity() * cw) / sum
        );
    }

    private RgbColorDto mixWeighted(
            RgbColorDto a, double aw,
            RgbColorDto b, double bw,
            RgbColorDto c, double cw,
            RgbColorDto d, double dw
    ) {
        double sum = Math.max(0.000001, aw + bw + cw + dw);
        return new RgbColorDto(
                (int) Math.round((a.r() * aw + b.r() * bw + c.r() * cw + d.r() * dw) / sum),
                (int) Math.round((a.g() * aw + b.g() * bw + c.g() * cw + d.g() * dw) / sum),
                (int) Math.round((a.b() * aw + b.b() * bw + c.b() * cw + d.b() * dw) / sum),
                (a.opacity() * aw + b.opacity() * bw + c.opacity() * cw + d.opacity() * dw) / sum
        );
    }

    private double smoothstep(double value) {
        double t = clamp01(value);
        return t * t * (3.0 - 2.0 * t);
    }

    private record SideLight(double litSide, double darkSide) {
        double contrast() { return Math.max(0.0, litSide - darkSide); }
    }

    private record LightGradient(double x, double y) {
        double magnitude() { return Math.hypot(x, y); }
    }

    private RgbColorDto withOpacity(RgbColorDto color, double opacity) {
        return new RgbColorDto(color.r(), color.g(), color.b(), clamp01(opacity));
    }

    private record DisplayValues(
            Double lightDirectionAngle,
            Double lightGradient,
            Double highlightDirectionAngle,
            Double highlightStrength,
            Double highlightClarity
    ) {
    }

    private record ShadowVisual(Double angleDegrees, Double gradient) {
        static ShadowVisual none() { return new ShadowVisual(null, null); }
    }

    private record HighlightVisual(Double angleDegrees, Double strength, Double clarity) {
        static HighlightVisual none() { return new HighlightVisual(null, null, null); }
    }

    private double normalizeDegrees(double degrees) {
        double value = degrees % 360.0;
        return value < 0.0 ? value + 360.0 : value;
    }

    private double samplePreparedLight(double x, double y) {
        if (cachedLightMap != null) {
            return lighting.sampleLightMap(cachedLightMap, cachedLightCols, cachedLightRows, cachedGridStep, x, y);
        }
        return lighting.sampleLightAt(x, y);
    }
}


