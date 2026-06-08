package com.hellengi.biolab.dto.database_mapper;

import com.hellengi.biolab.database.entity.SnapshotEntity;
import com.hellengi.biolab.database.entity.common.*;
import com.hellengi.biolab.database.entity.snapshot.*;
import com.hellengi.biolab.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SnapshotMapper {
    private final GenomeEntityMapper genomeMapper;
    private final JsonMapper objectMapper;

    public SnapshotEntity toEntity(String name, LocalDateTime createdAt, SnapshotDto snapshot) {
        if (snapshot == null || snapshot.world() == null || snapshot.settings() == null) {
            throw new IllegalArgumentException("Snapshot world and settings must not be null");
        }

        SnapshotEntity entity = new SnapshotEntity();
        entity.setName(name);
        entity.setCreatedAt(createdAt);
        entity.setWorldState(worldState(snapshot.world()));
        entity.setSettingsJson(settingsJson(snapshot.settings()));
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
        SimulationSettingsDto settings = settings(entity.getSettingsJson());
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
        cell.setPhysicalState(physical(dto.x(), dto.y(), dto.vx(), dto.vy(), dto.angularVelocity(), dto.radius(), dto.mass(), dto.density(), dto.opacity(), dto.directionAngle()));
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

        for (FlagellumSlotDto slot : safe(dto.flagellumSlots())) {
            cell.addFlagellumSlot(flagellumSlot(slot));
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
        DamageFlowEntity nd = nucleus.getDamageFlow();
        DamageFlowEntity cd = cytosol.getDamageFlow();
        DamageFlowEntity cpd = chloroplasts.getDamageFlow();
        DamageFlowEntity md = membrane.getDamageFlow();
        DamageFlowEntity ld = lysosomes.getDamageFlow();

        return new CellDto(
                entity.getWorldCellId(),
                p.getX(), p.getY(), p.getVx(), p.getVy(), p.getAngularVelocity(),
                e.getEnergy(), p.getRadius(),
                nl.getX(), nl.getY(), nucleus.getRadius(), nl.getTargetX(), nl.getTargetY(),
                !entity.isAlive(),
                genomeMapper.toDto(entity.getGenome()),
                entity.getLifetimeTicks(), entity.getLocalLight(), p.getMass(), p.getDensity(), p.getOpacity(),
                nd.getDamage(), cd.getDamage(), cpd.getDamage(), md.getDamage(), ld.getDamage(), averageFlagellumDamage(entity),
                e.getProductionRate(), e.getDigestionProductionRate(), e.getConsumptionRate(), 1.0, e.getConsumptionRate(), e.getDigestionCostRate(),
                cpd.getDamageRate(), nd.getDamageRate(), cd.getDamageRate(), md.getDamageRate(), ld.getDamageRate(), flagellumDamageRate(entity),
                cpd.getRepairRate(), nd.getRepairRate(), nd.getRepairEnergyCostRate(), cd.getRepairRate(), md.getRepairRate(), md.getRepairEnergyCostRate(), ld.getRepairRate(), flagellumRepairRate(entity),
                e.getRepairCostRate(), ld.getRepairEnergyCostRate(), flagellumRepairEnergyCostRate(entity),
                chloroplasts.getCarotProtection(), membrane.getLightTransmittance(),
                lysosomes.getCapacity(), lysosomes.getOccupiedSlots(),
                entity.getLysosomeSlots().stream().map(this::slot).toList(),
                entity.getFlagellumSlots().size(),
                entity.getFlagellumSlots().stream().map(this::flagellumSlot).toList(),
                entity.getEvents().stream().map(this::event).toList(),
                null, null,
                p.getDirectionAngle()
        );
    }

    private SnapshotCellNucleusStateEntity nucleus(CellDto dto) {
        SnapshotCellNucleusStateEntity entity = new SnapshotCellNucleusStateEntity();
        entity.setRadius(dto.nucleusRadius());
        entity.setLayout(layout(dto.nucleusOffsetX(), dto.nucleusOffsetY(), dto.nucleusRadius(), 0.0, dto.nucleusTargetOffsetX(), dto.nucleusTargetOffsetY(), dto.nucleusRadius(), 0.0));
        entity.setDamageFlow(damage(dto.nucleusDamage(), dto.nucleusDamageRate(), dto.nucleusRepairRate(), dto.nucleusRepairEnergyCostRate()));
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
        entity.setDamageFlow(damage(dto.membraneDamage(), dto.membraneDamageRate(), dto.membraneRepairRate(), dto.membraneRepairEnergyCostRate()));
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

    private SnapshotFlagellumSlotEntity flagellumSlot(FlagellumSlotDto dto) {
        SnapshotFlagellumSlotEntity entity = new SnapshotFlagellumSlotEntity();
        entity.setSlotIndex(dto.index());
        entity.setLastForce(dto.force());
        entity.setLastTorque(dto.torque());
        entity.setLastBaseX(dto.baseX());
        entity.setLastBaseY(dto.baseY());
        entity.setLastDirectionX(dto.directionX());
        entity.setLastDirectionY(dto.directionY());
        entity.setLastEnergyCostRate(dto.energyCostRate());
        entity.setDamageFlow(damage(dto.damage(), dto.damageRate(), dto.repairRate(), dto.repairEnergyCostRate()));
        return entity;
    }

    private FlagellumSlotDto flagellumSlot(SnapshotFlagellumSlotEntity entity) {
        DamageFlowEntity d = entity.getDamageFlow();
        return new FlagellumSlotDto(
                entity.getSlotIndex(),
                0.0,
                d.getDamage(),
                Math.max(0.0, 1.0 - d.getDamage()),
                entity.getLastBaseX(),
                entity.getLastBaseY(),
                entity.getLastDirectionX(),
                entity.getLastDirectionY(),
                0.0,
                0.0,
                entity.getLastForce(),
                entity.getLastTorque(),
                entity.getLastEnergyCostRate(),
                d.getDamageRate(),
                d.getRepairRate(),
                d.getRepairEnergyCostRate()
        );
    }

    private double averageFlagellumDamage(SnapshotCellEntity entity) {
        return entity.getFlagellumSlots().stream()
                .mapToDouble(slot -> slot.getDamageFlow().getDamage())
                .average()
                .orElse(0.0);
    }

    private double flagellumDamageRate(SnapshotCellEntity entity) {
        return entity.getFlagellumSlots().stream()
                .mapToDouble(slot -> slot.getDamageFlow().getDamageRate())
                .sum();
    }

    private double flagellumRepairRate(SnapshotCellEntity entity) {
        return entity.getFlagellumSlots().stream()
                .mapToDouble(slot -> slot.getDamageFlow().getRepairRate())
                .sum();
    }

    private double flagellumRepairEnergyCostRate(SnapshotCellEntity entity) {
        return entity.getFlagellumSlots().stream()
                .mapToDouble(slot -> slot.getDamageFlow().getRepairEnergyCostRate())
                .sum();
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
        entity.setPhysicalState(physical(dto.x(), dto.y(), 0.0, 0.0, 0.0, dto.radius(), 0.0, 0.0, null, 0.0));
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

    private String settingsJson(SimulationSettingsDto dto) {
        try {
            return objectMapper.writeValueAsString(dto);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize snapshot settings", e);
        }
    }

    private SimulationSettingsDto settings(String json) {
        try {
            return objectMapper.readValue(json, SimulationSettingsDto.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to deserialize snapshot settings", e);
        }
    }

    private PhysicalStateEntity physical(double x, double y, double vx, double vy, double angularVelocity, double radius, double mass, double density, Double opacity, double directionAngle) {
        PhysicalStateEntity state = new PhysicalStateEntity();
        state.setX(x); state.setY(y); state.setVx(vx); state.setVy(vy); state.setAngularVelocity(angularVelocity); state.setRadius(radius); state.setMass(mass); state.setDensity(density); state.setOpacity(opacity); state.setDirectionAngle(directionAngle);
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

    private <T> List<T> safe(List<T> list) {
        return list == null ? List.of() : list;
    }
}




