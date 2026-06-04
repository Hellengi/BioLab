package com.hellengi.biolab.dto.database_mapper;

import com.hellengi.biolab.database.entity.SnapshotEntity;
import com.hellengi.biolab.database.entity.common.*;
import com.hellengi.biolab.database.entity.settings.*;
import com.hellengi.biolab.database.entity.snapshot.*;
import com.hellengi.biolab.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SnapshotMapper {
    private final GenomeEntityMapper genomeMapper;

    public SnapshotEntity toEntity(String name, LocalDateTime createdAt, SnapshotDto snapshot) {
        if (snapshot == null || snapshot.world() == null || snapshot.settings() == null) {
            throw new IllegalArgumentException("Snapshot world and settings must not be null");
        }

        SnapshotEntity entity = new SnapshotEntity();
        entity.setName(name);
        entity.setCreatedAt(createdAt);
        entity.setWorldState(worldState(snapshot.world()));
        entity.setSettings(settings(snapshot.settings()));
        entity.setLighting(lighting(snapshot.world().lighting()));

        int cellIndex = 0;
        for (CellDto cell : safe(snapshot.world().cells())) {
            entity.addCell(cell(cell, cellIndex++));
        }

        int foodIndex = 0;
        for (FoodDto food : safe(snapshot.world().foods())) {
            entity.addFood(food(food, foodIndex++));
        }

        return entity;
    }

    public SnapshotDto toDto(SnapshotEntity entity) {
        SimulationWorldDto world = world(entity);
        SimulationSettingsDto settings = settings(entity.getSettings());
        return new SnapshotDto(entity.getId(), entity.getName(), entity.getCreatedAt(), world, settings);
    }

    private SnapshotWorldStateEntity worldState(SimulationWorldDto dto) {
        SnapshotWorldStateEntity state = new SnapshotWorldStateEntity();
        state.setTick(dto.tick());
        state.setTime(dto.time());
        state.setFoodSpawnBudget(dto.foodSpawnProgress());
        state.setTubeDiameter(dto.tubeDiameter());
        return state;
    }

    private SimulationWorldDto world(SnapshotEntity entity) {
        SnapshotWorldStateEntity state = entity.getWorldState();
        return new SimulationWorldDto(
                state.getTick(),
                state.getTime(),
                state.getFoodSpawnBudget(),
                state.getTubeDiameter(),
                entity.getCells().stream().map(this::cell).toList(),
                entity.getFoods().stream().map(this::food).toList(),
                lighting(entity.getLighting())
        );
    }

    private SnapshotCellEntity cell(CellDto dto, int position) {
        SnapshotCellEntity cell = new SnapshotCellEntity();
        cell.setPositionInSnapshot(position);
        cell.setWorldCellId(dto.id());
        cell.setAlive(!dto.dead());
        cell.setLifetimeTicks(dto.lifetimeTicks());
        cell.setLocalLight(dto.localLight());
        cell.setPhysicalState(physical(dto.x(), dto.y(), dto.vx(), dto.vy(), dto.radius(), dto.mass(), dto.density(), dto.opacity(), dto.directionAngle()));
        cell.setEnergyFlow(energy(dto.energy(), dto.energyProduction(), dto.energyConsumption(), dto.digestionEnergyProduction(), dto.digestionEnergyCostRate(), dto.repairEnergyCostRate(), 0.0));
        cell.setGenome(genomeMapper.toEntity(dto.genome()));
        cell.setNucleusState(nucleus(dto));
        cell.setCytosolState(cytosol(dto));
        cell.setMembraneState(membrane(dto));
        cell.setChloroplastsState(chloroplasts(dto));
        cell.setLysosomesState(lysosomes(dto));

        for (LysosomeSlotDto slot : safe(dto.lysosomeSlots())) {
            cell.addLysosomeSlot(slot(slot));
        }

        int eventIndex = 0;
        for (CellEventDto event : safe(dto.events())) {
            cell.addEvent(event(event, eventIndex++));
        }

        return cell;
    }

    private CellDto cell(SnapshotCellEntity entity) {
        PhysicalStateEntity p = entity.getPhysicalState();
        EnergyFlowEntity e = entity.getEnergyFlow();
        SnapshotCellNucleusStateEntity nucleus = entity.getNucleusState();
        SnapshotCellCytosolStateEntity cytosol = entity.getCytosolState();
        SnapshotCellChloroplastsStateEntity chloroplasts = entity.getChloroplastsState();
        SnapshotCellLysosomesStateEntity lysosomes = entity.getLysosomesState();
        SnapshotCellMembraneStateEntity membrane = entity.getMembraneState();
        LayoutStateEntity nl = nucleus.getLayout();
        DamageFlowEntity cd = cytosol.getDamageFlow();
        DamageFlowEntity cpd = chloroplasts.getDamageFlow();
        DamageFlowEntity ld = lysosomes.getDamageFlow();

        return new CellDto(
                entity.getWorldCellId(),
                p.getX(), p.getY(), p.getVx(), p.getVy(),
                e.getEnergy(), p.getRadius(),
                nl.getX(), nl.getY(), nucleus.getRadius(), nl.getTargetX(), nl.getTargetY(),
                !entity.isAlive(),
                genomeMapper.toDto(entity.getGenome()),
                entity.getLifetimeTicks(), entity.getLocalLight(), p.getMass(), p.getDensity(), p.getOpacity(),
                cd.getDamage(), cpd.getDamage(), ld.getDamage(),
                e.getProductionRate(), e.getDigestionProductionRate(), e.getConsumptionRate(), e.getDigestionCostRate(),
                cpd.getDamageRate(), cd.getDamageRate(), ld.getDamageRate(),
                cpd.getRepairRate(), cd.getRepairRate(), ld.getRepairRate(),
                e.getRepairCostRate(), ld.getRepairEnergyCostRate(),
                chloroplasts.getCarotProtection(), membrane.getLightTransmittance(),
                lysosomes.getCapacity(), lysosomes.getOccupiedSlots(),
                entity.getLysosomeSlots().stream().map(this::slot).toList(),
                entity.getEvents().stream().map(this::event).toList(),
                null, null,
                p.getDirectionAngle()
        );
    }

    private SnapshotCellNucleusStateEntity nucleus(CellDto dto) {
        SnapshotCellNucleusStateEntity entity = new SnapshotCellNucleusStateEntity();
        entity.setRadius(dto.nucleusRadius());
        entity.setLayout(layout(dto.nucleusOffsetX(), dto.nucleusOffsetY(), dto.nucleusRadius(), 0.0, dto.nucleusTargetOffsetX(), dto.nucleusTargetOffsetY(), dto.nucleusRadius(), 0.0));
        return entity;
    }

    private SnapshotCellCytosolStateEntity cytosol(CellDto dto) {
        SnapshotCellCytosolStateEntity entity = new SnapshotCellCytosolStateEntity();
        entity.setOpacity(dto.opacity() != null ? dto.opacity() : 0.0);
        entity.setDamageFlow(damage(dto.cellDamage(), dto.cellDamageRate(), dto.cellRepairRate(), dto.repairEnergyCostRate()));
        return entity;
    }

    private SnapshotCellMembraneStateEntity membrane(CellDto dto) {
        SnapshotCellMembraneStateEntity entity = new SnapshotCellMembraneStateEntity();
        entity.setOpacity(dto.opacity() != null ? dto.opacity() : 0.0);
        entity.setLightTransmittance(dto.membraneLightTransmittance());
        return entity;
    }

    private SnapshotCellChloroplastsStateEntity chloroplasts(CellDto dto) {
        SnapshotCellChloroplastsStateEntity entity = new SnapshotCellChloroplastsStateEntity();
        entity.setCarotProtection(dto.carotProtection());
        entity.setDamageFlow(damage(dto.cpDamage(), dto.cpPhotoDamageRate(), dto.cpRepairRate(), 0.0));
        return entity;
    }

    private SnapshotCellLysosomesStateEntity lysosomes(CellDto dto) {
        SnapshotCellLysosomesStateEntity entity = new SnapshotCellLysosomesStateEntity();
        entity.setCapacity(dto.lysosomeCapacity());
        entity.setOccupiedSlots(dto.lysosomeOccupiedSlots());
        entity.setDamageFlow(damage(dto.lysosomeDamage(), dto.lysosomeDamageRate(), dto.lysosomeRepairRate(), dto.lysosomeRepairEnergyCostRate()));
        return entity;
    }

    private SnapshotLysosomeSlotEntity slot(LysosomeSlotDto dto) {
        SnapshotLysosomeSlotEntity entity = new SnapshotLysosomeSlotEntity();
        entity.setSlotIndex(dto.index());
        entity.setFoodWorldId(dto.foodId());
        entity.setOccupied(dto.occupied());
        entity.setPerformance(dto.performance());
        entity.setFoodEnergy(dto.foodEnergy());
        entity.setFoodRadius(dto.foodRadius());
        entity.setFoodInsideLysosome(dto.foodInsideLysosome());
        entity.setTargetFoodRadius(dto.targetFoodRadius());
        entity.setLayout(layout(dto.layoutX(), dto.layoutY(), dto.layoutRadius(), dto.layoutRotation(), dto.targetLayoutX(), dto.targetLayoutY(), dto.targetLayoutRadius(), dto.targetLayoutRotation()));
        entity.setEnergyFlow(energy(dto.foodEnergy(), dto.energyProductionRate(), dto.energyCostRate(), 0.0, 0.0, dto.repairEnergyCostRate(), 0.0));
        entity.setDamageFlow(damage(dto.damage(), dto.damageRate(), dto.repairRate(), dto.repairEnergyCostRate()));
        return entity;
    }

    private LysosomeSlotDto slot(SnapshotLysosomeSlotEntity entity) {
        LayoutStateEntity l = entity.getLayout();
        EnergyFlowEntity e = entity.getEnergyFlow();
        DamageFlowEntity d = entity.getDamageFlow();
        return new LysosomeSlotDto(
                entity.getSlotIndex(), entity.getFoodWorldId(), d.getDamage(), entity.isOccupied(), entity.getPerformance(),
                entity.getFoodEnergy(), entity.getFoodRadius(), entity.isFoodInsideLysosome(), entity.getTargetFoodRadius(),
                l.getX(), l.getY(), l.getRadius(), l.getRotation(), l.getTargetX(), l.getTargetY(), l.getTargetRadius(), l.getTargetRotation(),
                e.getProductionRate(), e.getConsumptionRate(), d.getDamageRate(), d.getRepairRate(), d.getRepairEnergyCostRate()
        );
    }

    private SnapshotCellEventEntity event(CellEventDto dto, int position) {
        SnapshotCellEventEntity entity = new SnapshotCellEventEntity();
        entity.setPositionInCell(position);
        entity.setType(dto.type());
        entity.setEventTime(dto.time());
        entity.setDuration(dto.duration());
        entity.setImpulse(dto.impulse());
        entity.setNormalX(dto.normalX());
        entity.setNormalY(dto.normalY());
        return entity;
    }

    private CellEventDto event(SnapshotCellEventEntity entity) {
        return new CellEventDto(entity.getType(), entity.getEventTime(), entity.getDuration(), entity.getImpulse(), entity.getNormalX(), entity.getNormalY());
    }

    private SnapshotFoodEntity food(FoodDto dto, int position) {
        SnapshotFoodEntity entity = new SnapshotFoodEntity();
        entity.setPositionInSnapshot(position);
        entity.setWorldFoodId(dto.id());
        entity.setConsumed(dto.consumed());
        entity.setCapturedByCellId(dto.capturedByCellId());
        entity.setDigestionSlotIndex(dto.digestionSlotIndex());
        entity.setInsideLysosome(dto.insideLysosome());
        entity.setCapturedCellAnchorX(dto.capturedCellAnchorX());
        entity.setCapturedCellAnchorY(dto.capturedCellAnchorY());
        entity.setPhysicalState(physical(dto.x(), dto.y(), 0.0, 0.0, dto.radius(), 0.0, 0.0, null, 0.0));
        entity.setEnergyFlow(energy(dto.energy(), 0.0, 0.0, 0.0, 0.0, 0.0, 0.0));
        return entity;
    }

    private FoodDto food(SnapshotFoodEntity entity) {
        PhysicalStateEntity p = entity.getPhysicalState();
        EnergyFlowEntity e = entity.getEnergyFlow();
        return new FoodDto(entity.getWorldFoodId(), p.getX(), p.getY(), e.getEnergy(), p.getRadius(), entity.isConsumed(), entity.getCapturedByCellId(), entity.getDigestionSlotIndex(), entity.isInsideLysosome(), entity.getCapturedCellAnchorX(), entity.getCapturedCellAnchorY());
    }

    private SnapshotLightingEntity lighting(LightingDto dto) {
        SnapshotLightingEntity entity = new SnapshotLightingEntity();
        if (dto == null) {
            return entity;
        }
        entity.setGlobalLight(dto.globalLight());
        entity.setCycleTick(dto.cycleTick());
        entity.setGridStep(dto.gridStep());
        entity.setGridWidth(dto.gridWidth());
        entity.setGridHeight(dto.gridHeight());
        int i = 0;
        for (LightSourceDto source : safe(dto.sources())) {
            SnapshotLightSourceEntity item = new SnapshotLightSourceEntity();
            item.setPositionInSnapshot(i++);
            item.setX(source.x());
            item.setY(source.y());
            item.setBrightness(source.brightness());
            item.setOrbitRadius(source.orbitRadius());
            item.setOrbitSpeed(source.orbitSpeed());
            item.setAngle(source.angle());
            item.setRenderType(source.renderType());
            entity.addSource(item);
        }
        return entity;
    }

    private LightingDto lighting(SnapshotLightingEntity entity) {
        if (entity == null) {
            return null;
        }
        return new LightingDto(
                entity.getGlobalLight(), entity.getCycleTick(),
                entity.getSources().stream().map(s -> new LightSourceDto(s.getX(), s.getY(), s.getBrightness(), s.getOrbitRadius(), s.getOrbitSpeed(), s.getAngle(), s.getRenderType())).toList(),
                entity.getGridStep(), entity.getGridWidth(), entity.getGridHeight(),
                new double[0], null, new double[0], List.of()
        );
    }

    private SnapshotSettingsEntity settings(SimulationSettingsDto dto) {
        SnapshotSettingsEntity entity = new SnapshotSettingsEntity();
        entity.setTubeDiameter(dto.tubeDiameter());
        entity.setTickRateMs(dto.tickRateMs());
        entity.setPaused(dto.paused());
        entity.setSpeedFactor(dto.speedFactor());
        entity.setTemperatureCelsius(dto.temperatureCelsius());
        entity.setViscosity(dto.viscosity());
        entity.setGravity(dto.gravity());

        entity.getTime().setTimeSlider(ranged(dto.timeSlider()));
        entity.getEnvironment().setInitialCellCount(ranged(dto.initialCellCount()));
        entity.getEnvironment().setFoodSpawnIntensity(ranged(dto.foodSpawnIntensity()));
        entity.getEnvironment().setGravitySlider(ranged(dto.gravitySlider()));
        entity.getEnvironment().setViscositySlider(ranged(dto.viscositySlider()));
        entity.getEnvironment().setTurbiditySlider(ranged(dto.turbiditySlider()));
        entity.getEnvironment().setRadiationSlider(ranged(dto.radiationSlider()));
        entity.getLightCycle().setGlobalLightPercent(ranged(dto.globalLightPercent()));
        entity.getLightCycle().setEnabled(dto.globalLightCycleEnabled());
        entity.getLightCycle().setMinPercent(ranged(dto.globalLightCycleMinPercent()));
        entity.getLightCycle().setPeriodSeconds(ranged(dto.globalLightCyclePeriodSeconds()));
        entity.getLocalLights().setEnabled(dto.localLightSourcesEnabled());
        entity.getLocalLights().setSourceCount(ranged(dto.lightSourceCount()));
        entity.getLocalLights().setStartAngle(ranged(dto.lightSourceStartAngle()));
        entity.getLocalLights().setBrightness(ranged(dto.lightSourceBrightness()));
        entity.getLocalLights().setOrbitRadius(ranged(dto.lightSourceOrbitRadius()));
        entity.getLocalLights().setOrbitSpeed(ranged(dto.lightSourceOrbitSpeed()));
        entity.getFood().setBaseRadius(dto.foodBaseRadius());
        entity.getFood().setInitialCount(dto.initialFoodCount());
        entity.getFood().setEnergyMin(dto.foodEnergyMin());
        entity.getFood().setEnergyMax(dto.foodEnergyMax());
        entity.getCell().setBaseRadius(dto.cellBaseRadius());
        entity.getCell().setRadiusScale(dto.cellRadiusScale());
        entity.getCell().setMinEnergy(dto.minCellEnergy());
        entity.getCell().setEnergyDecayPerTick(dto.cellEnergyDecayPerTick());
        entity.getCell().setInitialSpeed(ranged(dto.initialCellSpeed()));
        entity.getCell().setInitialDirection(ranged(dto.initialCellDirection()));
        entity.setInitialGenome(genomeSettings(dto.initialGenome()));
        return entity;
    }

    private SimulationSettingsDto settings(SnapshotSettingsEntity e) {
        return new SimulationSettingsDto(
                ranged(e.getTime().getTimeSlider()),
                ranged(e.getEnvironment().getInitialCellCount()), ranged(e.getEnvironment().getFoodSpawnIntensity()),
                ranged(e.getEnvironment().getGravitySlider()), ranged(e.getEnvironment().getViscositySlider()), ranged(e.getEnvironment().getTurbiditySlider()), ranged(e.getEnvironment().getRadiationSlider()),
                ranged(e.getLightCycle().getGlobalLightPercent()), e.getLightCycle().isEnabled(), ranged(e.getLightCycle().getMinPercent()), ranged(e.getLightCycle().getPeriodSeconds()),
                e.getLocalLights().isEnabled(), ranged(e.getLocalLights().getSourceCount()), ranged(e.getLocalLights().getStartAngle()), ranged(e.getLocalLights().getBrightness()), ranged(e.getLocalLights().getOrbitRadius()), ranged(e.getLocalLights().getOrbitSpeed()),
                e.getTubeDiameter(), e.getTickRateMs(), e.isPaused(), e.getSpeedFactor(), e.getTemperatureCelsius(), e.getViscosity(), e.getGravity(),
                e.getCell().getBaseRadius(), e.getCell().getRadiusScale(), e.getFood().getBaseRadius(), e.getFood().getInitialCount(), e.getFood().getEnergyMin(), e.getFood().getEnergyMax(), e.getCell().getMinEnergy(), e.getCell().getEnergyDecayPerTick(),
                genomeSettings(e.getInitialGenome()), ranged(e.getCell().getInitialSpeed()), ranged(e.getCell().getInitialDirection())
        );
    }

    private GenomeSettingsEntity genomeSettings(GenomeSettingsDto dto) {
        GenomeSettingsEntity g = new GenomeSettingsEntity();
        g.getNucleus().setDivisionThreshold(ranged(dto.divisionThreshold()));
        g.getNucleus().setDivisionImpulse(ranged(dto.divisionImpulse()));
        g.getNucleus().setDivisionAngle(ranged(dto.divisionAngle()));
        g.getNucleus().setStartCellDamage(ranged(dto.startCellDamage()));
        g.getCytosol().setMaxEnergy(ranged(dto.maxEnergy()));
        g.getCytosol().setDryMass(ranged(dto.dryMass()));
        g.getCytosol().setGfp(ranged(dto.gfp()));
        g.getMembrane().setElasticity(ranged(dto.elasticity()));
        g.getMembrane().setMelaninEnabled(dto.melaninEnabled());
        g.getMembrane().setMelaninPercent(ranged(dto.melaninPercent()));
        g.getChloroplasts().setEnabled(dto.chloroplastEnabled());
        g.getChloroplasts().setAmount(ranged(dto.chloroplastAmount()));
        g.getChloroplasts().setChlorophyll(ranged(dto.chlorophyll()));
        g.getChloroplasts().setCarotenoids(ranged(dto.carotenoids()));
        g.getChloroplasts().setStartDamage(ranged(dto.startCpDamage()));
        g.getLysosomes().setEnabled(dto.lysosomeEnabled());
        g.getLysosomes().setAmount(ranged(dto.lysosomeAmount()));
        g.getLysosomes().setEnzymeActivity(ranged(dto.lysosomeEnzymeActivity()));
        return g;
    }

    private GenomeSettingsDto genomeSettings(GenomeSettingsEntity g) {
        return new GenomeSettingsDto(
                ranged(g.getNucleus().getDivisionThreshold()), ranged(g.getNucleus().getDivisionImpulse()), ranged(g.getNucleus().getDivisionAngle()), ranged(g.getNucleus().getStartCellDamage()),
                ranged(g.getCytosol().getMaxEnergy()), ranged(g.getCytosol().getDryMass()), ranged(g.getMembrane().getElasticity()), ranged(g.getCytosol().getGfp()),
                g.getMembrane().isMelaninEnabled(), ranged(g.getMembrane().getMelaninPercent()),
                g.getChloroplasts().isEnabled(), ranged(g.getChloroplasts().getAmount()), ranged(g.getChloroplasts().getChlorophyll()), ranged(g.getChloroplasts().getCarotenoids()), ranged(g.getChloroplasts().getStartDamage()),
                g.getLysosomes().isEnabled(), ranged(g.getLysosomes().getAmount()), ranged(g.getLysosomes().getEnzymeActivity()), null
        );
    }

    private PhysicalStateEntity physical(double x, double y, double vx, double vy, double radius, double mass, double density, Double opacity, double directionAngle) {
        PhysicalStateEntity state = new PhysicalStateEntity();
        state.setX(x); state.setY(y); state.setVx(vx); state.setVy(vy); state.setRadius(radius); state.setMass(mass); state.setDensity(density); state.setOpacity(opacity); state.setDirectionAngle(directionAngle);
        return state;
    }

    private EnergyFlowEntity energy(double energy, double production, double consumption, double digestionProduction, double digestionCost, double repairCost, double divisionCost) {
        EnergyFlowEntity state = new EnergyFlowEntity();
        state.setEnergy(energy); state.setProductionRate(production); state.setConsumptionRate(consumption); state.setDigestionProductionRate(digestionProduction); state.setDigestionCostRate(digestionCost); state.setRepairCostRate(repairCost); state.setDivisionCost(divisionCost);
        return state;
    }

    private DamageFlowEntity damage(double damage, double damageRate, double repairRate, double repairEnergyCostRate) {
        DamageFlowEntity state = new DamageFlowEntity();
        state.setDamage(damage); state.setDamageRate(damageRate); state.setRepairRate(repairRate); state.setRepairEnergyCostRate(repairEnergyCostRate);
        return state;
    }

    private LayoutStateEntity layout(double x, double y, double radius, double rotation, double targetX, double targetY, double targetRadius, double targetRotation) {
        LayoutStateEntity state = new LayoutStateEntity();
        state.setX(x); state.setY(y); state.setRadius(radius); state.setRotation(rotation); state.setTargetX(targetX); state.setTargetY(targetY); state.setTargetRadius(targetRadius); state.setTargetRotation(targetRotation);
        return state;
    }

    private RangedValueEntity ranged(RangedValueDto dto) {
        RangedValueEntity entity = new RangedValueEntity();
        if (dto != null) {
            entity.setValue(dto.value()); entity.setMin(dto.min()); entity.setMax(dto.max()); entity.setStep(dto.step()); entity.setInitial(dto.initial());
        }
        return entity;
    }

    private RangedValueDto ranged(RangedValueEntity entity) {
        return new RangedValueDto(entity.getValue(), entity.getMin(), entity.getMax(), entity.getStep(), entity.getInitial());
    }

    private <T> List<T> safe(List<T> list) {
        return list == null ? List.of() : list;
    }
}
