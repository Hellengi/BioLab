package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.physics.Lighting;
import com.hellengi.biolab.dto.CellDto;
import com.hellengi.biolab.dto.CellRenderDto;
import com.hellengi.biolab.dto.CellVisualDto;
import com.hellengi.biolab.dto.DisplayLayersDto;
import com.hellengi.biolab.dto.RgbColorDto;
import com.hellengi.biolab.dto.LysosomeSlotDto;
import com.hellengi.biolab.dto.FlagellumSlotDto;
import com.hellengi.biolab.dto.FlagellumSlotRenderDto;
import com.hellengi.biolab.dto.LysosomeSlotRenderDto;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import static com.hellengi.biolab.util.Utils.clamp01;
import static com.hellengi.biolab.util.Utils.safeList;
import static com.hellengi.biolab.util.Utils.smoothstep;
import static com.hellengi.biolab.util.Utils.wrapDegrees;
import static com.hellengi.biolab.dto.mapper.RgbColorUtils.mix;
import static com.hellengi.biolab.dto.mapper.RgbColorUtils.mixWeighted;
import static com.hellengi.biolab.dto.mapper.RgbColorUtils.withOpacity;

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
    private static final RgbColorDto CYTOSOL_COLOR = new RgbColorDto(238, 240, 232, 0.36);
    private static final RgbColorDto MEMBRANE_BASE_COLOR = new RgbColorDto(238, 240, 232, 0.095);
    private static final RgbColorDto MELANIN_COLOR = new RgbColorDto(65, 43, 30, 1.0);
    private static final RgbColorDto CHLOROPHYLL_LOW_COLOR = new RgbColorDto(154, 210, 82, 0.74);
    private static final RgbColorDto CHLOROPHYLL_HIGH_COLOR = new RgbColorDto(28, 96, 40, 0.74);
    private static final RgbColorDto CAROTENOID_COLOR = new RgbColorDto(128, 72, 32, 0.74);
    private static final RgbColorDto CHLOROPLAST_BLEACHED_COLOR = new RgbColorDto(238, 240, 232, 0.74);
    private static final RgbColorDto LYSOSOME_COLOR = new RgbColorDto(104, 31, 47, 0.72);
    private static final RgbColorDto LYSOSOME_GLOW_COLOR = new RgbColorDto(218, 224, 74, 0.0);
    private static final RgbColorDto FLAGELLUM_COLOR = new RgbColorDto(230, 170, 80, 0.86);
    private static final RgbColorDto Bioluminescence_COLOR = new RgbColorDto(83, 255, 139, 1.0);
    private static final RgbColorDto DAMAGE_COLOR = new RgbColorDto(96, 88, 76, 1.0);

    private final YamlConfig config;
    private final GenomeMapper genomeMapper;
    private final CellEventMapper cellEventMapper;
    private final CellMotionMapper cellMotionMapper;
    private final Lighting lighting;


    public CellDto toDto(Cell cell) {
        return toDto(cell, DisplayLayersDto.off(), RenderMappingContext.empty(0.0));
    }

    public CellDto toSnapshotDto(Cell cell) {
        return toDto(cell, null, RenderMappingContext.empty(0.0));
    }

    public CellDto toSnapshotDto(Cell cell, RenderMappingContext context) {
        return toDto(cell, null, context);
    }

    public CellRenderDto toRenderDto(Cell cell) {
        return toRenderDto(cell, RenderMappingContext.empty(0.0));
    }

    public CellRenderDto toRenderDto(Cell cell, RenderMappingContext context) {
        if (!cell.hasInternalLayoutInitialized()) {
            cell.ensureInternalLayoutInitialized();
        }

        RenderMappingContext safeContext = safeContext(context);
        double localLight = samplePreparedLight(safeContext, cell.getX(), cell.getY());
        CellVisualDto visual = calculateVisual(cell, safeContext);

        return new CellRenderDto(
                cell.getId(),
                cell.getX(),
                cell.getY(),
                cell.getVx(),
                cell.getVy(),
                cell.getAngularVelocity(),
                cell.getEnergy(),
                cell.getMaxEnergy(),
                cell.getRadius(),
                cell.getNucleusLayoutX(),
                cell.getNucleusLayoutY(),
                cell.getNucleusRadius(),
                cell.getNucleusLayoutTargetX(),
                cell.getNucleusLayoutTargetY(),
                !cell.isAlive(),
                Math.round(cell.getLifetimeTicks()),
                localLight,
                cell.getMass(),
                cell.getDryMass(),
                cell.getDensity(),
                cell.getOpacity(),
                cell.getNucleusDamage(),
                cell.getCellDamage(),
                cell.getCpDamage(),
                cell.getMembraneDamage(),
                cell.getLysosomeDamage(),
                cell.getAverageFlagellumDamage(),
                cell.getMembraneLightTransmittance(),
                cell.getLysosomeCapacity(),
                cell.getOccupiedLysosomeSlots(),
                lysosomeSlotsToRenderDto(cell),
                cell.getFlagellumCapacity(),
                flagellumSlotsToRenderDto(cell),
                visual,
                cell.getDirectionAngle()
        );
    }

    public CellDto toDto(Cell cell, DisplayLayersDto viewState) {
        return toDto(cell, viewState, RenderMappingContext.empty(0.0));
    }

    public CellDto toDto(Cell cell, DisplayLayersDto viewState, RenderMappingContext context) {
        if (!cell.hasInternalLayoutInitialized()) {
            cell.ensureInternalLayoutInitialized();
        }
        RenderMappingContext safeContext = safeContext(context);
        double localLight = samplePreparedLight(safeContext, cell.getX(), cell.getY());
        CellVisualDto visual = calculateVisual(cell, safeContext);
        boolean includeForces = viewState == null || viewState.selectedForcesEnabled(cell.getId());

        return new CellDto(
                cell.getId(),
                cell.getX(),
                cell.getY(),
                cell.getVx(),
                cell.getVy(),
                cell.getAngularVelocity(),
                cell.getEnergy(),
                cell.getMaxEnergy(),
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
                cell.getDryMass(),
                cell.getDensity(),
                cell.getOpacity(),
                cell.getNucleusDamage(),
                cell.getCellDamage(),
                cell.getCpDamage(),
                cell.getMembraneDamage(),
                cell.getLysosomeDamage(),
                cell.getAverageFlagellumDamage(),
                cell.getLastEnergyProduction(),
                cell.getLastDigestionEnergyProduction(),
                cell.getLastEnergyConsumption() + cell.getLastDigestionEnergyCostRate(),
                cell.getLastEnergyAvailability(),
                cell.getLastEnergyDemand(),
                cell.getLastDigestionEnergyCostRate(),
                cell.getLastCpPhotoDamageRate(),
                cell.getLastNucleusDamageRate(),
                cell.getLastCellDamageRate(),
                cell.getLastMembraneDamageRate(),
                cell.getLastLysosomeDamageRate(),
                cell.getLastFlagellumDamageRate(),
                cell.getLastCpRepairRate(),
                cell.getLastNucleusRepairRate(),
                cell.getLastNucleusRepairEnergyCostRate(),
                cell.getLastCellRepairRate(),
                cell.getLastMembraneRepairRate(),
                cell.getLastMembraneRepairEnergyCostRate(),
                cell.getLastLysosomeRepairRate(),
                cell.getLastFlagellumRepairRate(),
                cell.getLastRepairEnergyCostRate(),
                cell.getLastLysosomeRepairEnergyCostRate(),
                cell.getLastFlagellumRepairEnergyCostRate(),
                cell.getCarotProtection(),
                cell.getMembraneLightTransmittance(),
                cell.getLysosomeCapacity(),
                cell.getOccupiedLysosomeSlots(),
                lysosomeSlotsToDto(cell),
                cell.getFlagellumCapacity(),
                flagellumSlotsToDto(cell),
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
        cell.setAngularVelocity(dto.angularVelocity());
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
        cell.setDryMass(dto.dryMass() != null ? dto.dryMass() : Math.max(0.0, dto.mass() - Math.max(0.0, dto.energy()) * Math.max(0.0, config.getCell().getEnergyToMassFactor())));
        cell.setNucleusDamage(dto.nucleusDamage());
        cell.setCellDamage(dto.cellDamage());
        cell.setCpDamage(dto.cpDamage());
        cell.setMembraneDamage(dto.membraneDamage());
        cell.setLastEnergyProduction(dto.energyProduction());
        cell.setLastDigestionEnergyProduction(dto.digestionEnergyProduction());
        cell.setLastEnergyConsumption(dto.energyConsumption() - dto.digestionEnergyCostRate());
        cell.setLastEnergyAvailability(dto.energyAvailability());
        cell.setLastEnergyDemand(dto.energyDemand());
        cell.setLastDigestionEnergyCostRate(dto.digestionEnergyCostRate());
        cell.setLastCpPhotoDamageRate(dto.cpPhotoDamageRate());
        cell.setLastNucleusDamageRate(dto.nucleusDamageRate());
        cell.setLastCellDamageRate(dto.cellDamageRate());
        cell.setLastMembraneDamageRate(dto.membraneDamageRate());
        cell.setLastLysosomeDamageRate(dto.lysosomeDamageRate());
        cell.setLastFlagellumDamageRate(dto.flagellumDamageRate());
        cell.setLastCpRepairRate(dto.cpRepairRate());
        cell.setLastNucleusRepairRate(dto.nucleusRepairRate());
        cell.setLastNucleusRepairEnergyCostRate(dto.nucleusRepairEnergyCostRate());
        cell.setLastCellRepairRate(dto.cellRepairRate());
        cell.setLastMembraneRepairRate(dto.membraneRepairRate());
        cell.setLastMembraneRepairEnergyCostRate(dto.membraneRepairEnergyCostRate());
        cell.setLastLysosomeRepairRate(dto.lysosomeRepairRate());
        cell.setLastFlagellumRepairRate(dto.flagellumRepairRate());
        cell.setLastRepairEnergyCostRate(dto.repairEnergyCostRate());
        cell.setLastLysosomeRepairEnergyCostRate(dto.lysosomeRepairEnergyCostRate());
        cell.setLastFlagellumRepairEnergyCostRate(dto.flagellumRepairEnergyCostRate());
        cell.setLysosomeSlots(lysosomeSlotsToDomain(dto.lysosomeSlots()));
        cell.setFlagellumSlots(flagellumSlotsToDomain(dto.flagellumSlots()));
        cell.setEvents(cellEventMapper.toDomainList(dto.events()));
        cell.ensureInternalLayoutInitialized();
        return cell;
    }

    private List<LysosomeSlotRenderDto> lysosomeSlotsToRenderDto(Cell cell) {
        return cell.getLysosomeSlots().stream()
                .map(slot -> new LysosomeSlotRenderDto(
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
                        slot.getTargetLayoutRotation()
                ))
                .toList();
    }

    private List<FlagellumSlotRenderDto> flagellumSlotsToRenderDto(Cell cell) {
        return cell.getFlagellumSlots().stream()
                .map(slot -> new FlagellumSlotRenderDto(
                        slot.getIndex(),
                        cell.flagellumMotorPower(slot.getIndex()),
                        slot.getDamage(),
                        flagellumFunctionalPerformance(cell, slot),
                        cell.getFlagellumBaseLocalX(slot.getIndex()),
                        cell.getFlagellumBaseLocalY(slot.getIndex()),
                        cell.getFlagellumDirectionX(slot.getIndex()),
                        cell.getFlagellumDirectionY(slot.getIndex()),
                        cell.getFlagellumLength(slot.getIndex()),
                        cell.getFlagellumThickness(),
                        slot.getLastForce()
                ))
                .toList();
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
        return safeList(slots).stream()
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

    private List<com.hellengi.biolab.domain.model.FlagellumSlot> flagellumSlotsToDomain(List<FlagellumSlotDto> slots) {
        return safeList(slots).stream()
                .map(slot -> {
                    com.hellengi.biolab.domain.model.FlagellumSlot domainSlot = new com.hellengi.biolab.domain.model.FlagellumSlot(slot.index(), slot.damage());
                    domainSlot.rememberPhysics(slot.force(), slot.torque(), slot.baseX(), slot.baseY(), slot.directionX(), slot.directionY(), slot.energyCostRate());
                    domainSlot.rememberDamageRate(slot.damageRate());
                    domainSlot.rememberRepairRates(slot.repairRate(), slot.repairEnergyCostRate());
                    return domainSlot;
                })
                .toList();
    }

    private List<FlagellumSlotDto> flagellumSlotsToDto(Cell cell) {
        return cell.getFlagellumSlots().stream()
                .map(slot -> new FlagellumSlotDto(
                        slot.getIndex(),
                        cell.flagellumMotorPower(slot.getIndex()),
                        slot.getDamage(),
                        flagellumFunctionalPerformance(cell, slot),
                        cell.getFlagellumBaseLocalX(slot.getIndex()),
                        cell.getFlagellumBaseLocalY(slot.getIndex()),
                        cell.getFlagellumDirectionX(slot.getIndex()),
                        cell.getFlagellumDirectionY(slot.getIndex()),
                        cell.getFlagellumLength(slot.getIndex()),
                        cell.getFlagellumThickness(),
                        slot.getLastForce(),
                        slot.getLastTorque(),
                        slot.getLastEnergyCostRate(),
                        slot.getLastDamageRate(),
                        slot.getLastRepairRate(),
                        slot.getLastRepairEnergyCostRate()
                ))
                .toList();
    }

    private double flagellumFunctionalPerformance(Cell cell, com.hellengi.biolab.domain.model.FlagellumSlot slot) {
        return clamp01(cell.flagellumMotorPower01(slot.getIndex()) * slot.performance() * cell.getLastEnergyAvailability());
    }

    private CellVisualDto calculateVisual(Cell cell, RenderMappingContext context) {
        double cellArea = Math.max(cell.getCellArea(), 1.0e-9);
        double lysosomeEnzyme = cell.getLysosomeEnzymeActivity01();

        double chlorophyll = cell.hasChloroplasts() ? cell.getChlorophyll01() : 0.0;
        double chlorophyllRange = clamp01((chlorophyll - 0.15) / 0.85);
        double carotenoids = cell.hasChloroplasts() ? cell.getCarotenoids01() : 0.0;
        double pigmentPresence = clamp01(Math.max(chlorophyll, carotenoids));

        double cpDamageWeight = clamp01(cell.getCpDamage()) * 0.5;
        double cellDamageWeight = clamp01(cell.getCellDamage());

        RgbColorDto chlorophyllColor = mix(CHLOROPHYLL_LOW_COLOR, CHLOROPHYLL_HIGH_COLOR, chlorophyllRange);
        RgbColorDto chloroplastPigmentColor = mixWeighted(
                chlorophyllColor, Math.max(0.001, chlorophyll),
                CAROTENOID_COLOR, carotenoids,
                CHLOROPLAST_BLEACHED_COLOR, 0.0
        );
        RgbColorDto chloroplastColor = mix(chloroplastPigmentColor, CHLOROPLAST_BLEACHED_COLOR, cpDamageWeight);

        RgbColorDto activeLysosomeColor = lysosomeAcidColor(lysosomeEnzyme);
        RgbColorDto lysosomeColor = withOpacity(
                activeLysosomeColor,
                cell.hasLysosomes() ? LYSOSOME_COLOR.opacity() : 0.0
        );

        double melaninVisibility = cell.getGenome() != null && cell.getGenome().isMelaninEnabled() ? cell.getMelanin01() : 0.0;
        double membraneChloroplastWeight = cell.hasChloroplasts()
                ? Math.sqrt(Math.max(0.0, cell.getCpTotalArea()) / cellArea)
                : 0.0;
        double membraneLysosomeWeight = cell.hasLysosomes()
                ? Math.sqrt(Math.max(0.0, cell.getLysosomeTotalArea()) / cellArea)
                : 0.0;
        double membraneMelaninWeight = Math.sqrt(clamp01(melaninVisibility));
        RgbColorDto membraneColor = mixWeighted(
                MEMBRANE_BASE_COLOR, 1.0,
                chloroplastColor, membraneChloroplastWeight,
                activeLysosomeColor, membraneLysosomeWeight,
                MELANIN_COLOR, membraneMelaninWeight
        );
        RgbColorDto flagellumColor = withOpacity(
                membraneColor,
                cell.hasFlagella() ? 1.0 : 0.0
        );

        RgbColorDto cytosolColor = mix(CYTOSOL_COLOR, DAMAGE_COLOR, cellDamageWeight);
        RgbColorDto cellColor = withOpacity(cytosolColor, cell.getCytosolOpacity());

        double lysosomeGlowStrength = 0.0;

        RgbColorDto nucleoidColor = withOpacity(NUCLEOID_COLOR, NUCLEOID_COLOR.opacity());

        DisplayValues display = calculateDisplay(cell, samplePreparedLight(context, cell.getX(), cell.getY()), context);
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
                flagellumColor,
                cell.getFlagellumCapacity(),
                Bioluminescence_COLOR,
                cell.getBioluminescence01(),
                display.lightDirectionAngle(),
                display.lightGradient(),
                display.highlightDirectionAngle(),
                display.highlightStrength(),
                display.highlightClarity()
        );
    }

    private DisplayValues calculateDisplay(Cell cell, double localLight, RenderMappingContext context) {
        double radius = Math.max(
                cell.getRadius() * LIGHT_DIRECTION_RADIUS_FACTOR,
                context.gridStep() * LIGHT_DIRECTION_MIN_GRID_RADIUS_FACTOR
        );

        HighlightVisual highlight = calculateHighlightVisual(cell, localLight, context);
        ShadowVisual shadow = calculateShadowVisual(cell, radius, context);

        return new DisplayValues(
                shadow.angleDegrees(),
                shadow.gradient(),
                highlight.angleDegrees(),
                highlight.strength(),
                highlight.clarity()
        );
    }

    private ShadowVisual calculateShadowVisual(Cell cell, double radius, RenderMappingContext context) {
        double lightSideAngle = estimateFallbackLightSideAngle(cell, radius, context);
        if (!Double.isFinite(lightSideAngle)) {
            return ShadowVisual.none();
        }

        SideLight sideLight = sampleDirectionalSideLight(cell, radius, lightSideAngle, context);
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

        return new ShadowVisual(wrapDegrees(Math.toDegrees(lightSideAngle)), displayGradient);
    }

    private double estimateFallbackLightSideAngle(Cell cell, double radius, RenderMappingContext context) {
        LightGradient gradient = estimateLightGradient(cell, radius, context);
        return gradient.magnitude() <= LIGHT_DIRECTION_VECTOR_EPSILON
                ? Double.NaN
                : Math.atan2(gradient.y(), gradient.x());
    }

    private HighlightVisual calculateHighlightVisual(Cell cell, double localLight, RenderMappingContext context) {
        double localSourceLight = Math.max(0.0, localLight - context.globalLight());
        if (localSourceLight <= HIGHLIGHT_MIN_LOCAL_LIGHT) {
            return HighlightVisual.none();
        }
        if (context.lightDirXMap() == null || context.lightDirYMap() == null) {
            return HighlightVisual.none();
        }

        double dirX = lighting.sampleScalarMap(context.lightDirXMap(), context.lightCols(), context.lightRows(), context.gridStep(), cell.getX(), cell.getY());
        double dirY = lighting.sampleScalarMap(context.lightDirYMap(), context.lightCols(), context.lightRows(), context.gridStep(), cell.getX(), cell.getY());

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
        return new HighlightVisual(wrapDegrees(Math.toDegrees(highlightAngle)), strength, clarity);
    }

    private LightGradient estimateLightGradient(Cell cell, double radius, RenderMappingContext context) {
        double gradientX = 0.0;
        double gradientY = 0.0;

        for (int i = 0; i < LIGHT_DIRECTION_RING_RADIUS_FACTORS.length; i++) {
            double ringRadius = radius * LIGHT_DIRECTION_RING_RADIUS_FACTORS[i];
            double weight = LIGHT_DIRECTION_RING_WEIGHTS[i];
            LightGradient ringGradient = estimateRingLightGradient(cell, ringRadius, context);

            gradientX += ringGradient.x() * weight;
            gradientY += ringGradient.y() * weight;
        }

        return new LightGradient(gradientX, gradientY);
    }

    private LightGradient estimateRingLightGradient(Cell cell, double radius, RenderMappingContext context) {
        double diagonal = radius * Math.sqrt(0.5);
        double cx = cell.getX();
        double cy = cell.getY();

        double north = samplePreparedLight(context, cx, cy - radius);
        double northEast = samplePreparedLight(context, cx + diagonal, cy - diagonal);
        double east = samplePreparedLight(context, cx + radius, cy);
        double southEast = samplePreparedLight(context, cx + diagonal, cy + diagonal);
        double south = samplePreparedLight(context, cx, cy + radius);
        double southWest = samplePreparedLight(context, cx - diagonal, cy + diagonal);
        double west = samplePreparedLight(context, cx - radius, cy);
        double northWest = samplePreparedLight(context, cx - diagonal, cy - diagonal);

        double gradientX = ((northEast + 2.0 * east + southEast) - (northWest + 2.0 * west + southWest)) / 4.0;
        double gradientY = ((southWest + 2.0 * south + southEast) - (northWest + 2.0 * north + northEast)) / 4.0;

        return new LightGradient(gradientX, gradientY);
    }

    private SideLight sampleDirectionalSideLight(Cell cell, double radius, double angle, RenderMappingContext context) {
        double dx = Math.cos(angle) * radius;
        double dy = Math.sin(angle) * radius;
        return new SideLight(
                samplePreparedLight(context, cell.getX() + dx, cell.getY() + dy),
                samplePreparedLight(context, cell.getX() - dx, cell.getY() - dy)
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

    private record SideLight(double litSide, double darkSide) {
        double contrast() { return Math.max(0.0, litSide - darkSide); }
    }

    private record LightGradient(double x, double y) {
        double magnitude() { return Math.hypot(x, y); }
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

    private RenderMappingContext safeContext(RenderMappingContext context) {
        return context == null ? RenderMappingContext.empty(0.0) : context;
    }

    private double samplePreparedLight(RenderMappingContext context, double x, double y) {
        RenderMappingContext safeContext = safeContext(context);
        if (safeContext.lightMap() != null) {
            return lighting.sampleLightMap(
                    safeContext.lightMap(),
                    safeContext.lightCols(),
                    safeContext.lightRows(),
                    safeContext.gridStep(),
                    x,
                    y
            );
        }
        return lighting.sampleLightAt(x, y);
    }
}




