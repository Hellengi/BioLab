package com.hellengi.biolab.service;

import com.hellengi.biolab.config.SimulationProperties;
import com.hellengi.biolab.dto.SimulationConfigDto;
import com.hellengi.biolab.dto.WorldStateDto;
import com.hellengi.biolab.dto.DeadCellDto;
import com.hellengi.biolab.dto.FoodDto;
import com.hellengi.biolab.dto.GenomeDto;
import com.hellengi.biolab.dto.SaprotrophDto;
import com.hellengi.biolab.dto.SavedWorldListItemDto;
import com.hellengi.biolab.dto.SavedWorldSnapshotDto;
import com.hellengi.biolab.dto.CellTemplateDto;
import com.hellengi.biolab.dto.CreateCellRequestDto;
import com.hellengi.biolab.util.GenomeCodeCodec;
import com.hellengi.biolab.util.IdGenerator;
import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Food;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.model.Saprotroph;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Random;

@Service
public class SimulationService {

    private static final long SCHEDULER_POLL_INTERVAL_MS = 10L;

    private final SimulationProperties baseConfig;
    private final SimulationRuntimeOverrides runtimeOverrides = new SimulationRuntimeOverrides();
    private final SimulationEntityFactory entityFactory;
    private final GenomeMutationService genomeMutationService;
    private final SimulationMapper simulationMapper;
    private final SimulationBroadcaster simulationBroadcaster;
    private final SavedWorldService savedWorldService;

    private final SimulationWorld world = new SimulationWorld();
    private final Random random = new Random();

    public SimulationService(
            SimulationProperties baseConfig,
            SimulationEntityFactory entityFactory,
            GenomeMutationService genomeMutationService,
            SimulationMapper simulationMapper,
            SimulationBroadcaster simulationBroadcaster,
            SavedWorldService savedWorldService
    ) {
        this.baseConfig = baseConfig;
        this.entityFactory = entityFactory;
        this.genomeMutationService = genomeMutationService;
        this.simulationMapper = simulationMapper;
        this.simulationBroadcaster = simulationBroadcaster;
        this.savedWorldService = savedWorldService;
        reset();
    }

    private int currentInitialSaprotrophCount() {
        return runtimeOverrides.getInitialSaprotrophCount(baseConfig);
    }

    private int currentFoodGenerationIntensity() {
        return runtimeOverrides.getFoodGenerationIntensity(baseConfig);
    }

    private long currentDeadCellLifetimeTicks() {
        return runtimeOverrides.getDeadCellLifetimeTicks(baseConfig);
    }

    private SimulationConfigDto buildCurrentConfigDto() {
        return new SimulationConfigDto(
                baseConfig.getWorldWidth(),
                baseConfig.getWorldHeight(),
                baseConfig.getSimulationTickRateMs(),
                currentInitialSaprotrophCount(),
                baseConfig.getInitialFoodCount(),
                currentFoodGenerationIntensity(),
                baseConfig.getFoodEnergyMin(),
                baseConfig.getFoodEnergyRange(),
                baseConfig.getMinCellEnergy(),
                baseConfig.getSaprotrophBaseEnergyDecayPerTick(),
                baseConfig.getCellViscosityFactor(),
                currentDeadCellLifetimeTicks(),
                baseConfig.getClientSaprotrophBaseRadius(),
                baseConfig.getClientSaprotrophRadiusScale(),
                baseConfig.getClientDirectionVectorLength(),
                baseConfig.getClientFoodRadiusAtMinEnergy()
        );
    }

    public synchronized void start() {
        world.setRunning(true);
        world.setLastSimulationStepTimeMs(System.currentTimeMillis());
    }

    public synchronized void stop() {
        world.setRunning(false);
        world.setLastSimulationStepTimeMs(System.currentTimeMillis());
    }

    public synchronized void reset() {
        world.setRunning(false);
        world.setTick(0L);
        world.clear();

        for (int i = 0; i < currentInitialSaprotrophCount(); i++) {
            world.getSaprotrophs().add(
                    entityFactory.createRandomSaprotroph(
                            baseConfig.getInitialSpawnCenterX(),
                            baseConfig.getInitialSpawnCenterY()
                    )
            );
        }

        for (int i = 0; i < baseConfig.getInitialFoodCount(); i++) {
            world.getFoods().add(entityFactory.createRandomFood());
        }
    }

    public synchronized WorldStateDto getState() {
        return simulationMapper.toWorldStateDto(world, currentDeadCellLifetimeTicks());
    }

    public synchronized SimulationConfigDto getConfig() {
        return buildCurrentConfigDto();
    }

    public synchronized SimulationConfigDto updateConfig(SimulationConfigDto configDto) {
        runtimeOverrides.update(
                configDto.initialSaprotrophCount(),
                configDto.foodGenerationIntensity(),
                configDto.deadCellLifetimeTicks()
        );
        return buildCurrentConfigDto();
    }

    public synchronized SimulationConfigDto resetConfigToDefaults() {
        runtimeOverrides.reset();
        return buildCurrentConfigDto();
    }

    @Scheduled(fixedRate = SCHEDULER_POLL_INTERVAL_MS)
    public void simulationTick() {
        WorldStateDto snapshot;

        synchronized (this) {
            if (world.isRunning()) {
                long now = System.currentTimeMillis();
                long interval = baseConfig.getSimulationTickRateMs();
                long elapsed = now - world.getLastSimulationStepTimeMs();

                if (elapsed >= interval) {
                    long steps = Math.max(1L, elapsed / interval);
                    steps = Math.min(steps, 10L);

                    for (long i = 0; i < steps; i++) {
                        performSimulationStep();
                    }

                    world.setLastSimulationStepTimeMs(now);
                }
            }

            snapshot = simulationMapper.toWorldStateDto(world, currentDeadCellLifetimeTicks());
        }

        simulationBroadcaster.broadcast(snapshot);
    }

    public synchronized SavedWorldListItemDto saveWorld(String name) {
        SavedWorldSnapshotDto snapshot = new SavedWorldSnapshotDto(
                getState(),
                getConfig()
        );
        return savedWorldService.save(name, snapshot);
    }

    public synchronized List<SavedWorldListItemDto> listSavedWorlds() {
        return savedWorldService.list();
    }

    public synchronized void loadWorld(Long id) {
        SavedWorldSnapshotDto snapshot = savedWorldService.load(id);
        loadSnapshot(snapshot);
    }

    public synchronized void deleteWorld(Long id) {
        savedWorldService.delete(id);
    }

    public synchronized void createCell(CreateCellRequestDto requestDto) {
        CellTemplateDto dto = requestDto.cell();

        Genome genome = new Genome(
                dto.divisionThreshold(),
                dto.divisionImpulseStrength(),
                dto.colorHue(),
                dto.lightness(),
                dto.maxEnergy()
        );

        double initialEnergy = Math.max(
                baseConfig.getMinCellEnergy(),
                genome.getMaxEnergy() / 2.0
        );

        double angle = random.nextDouble() * Math.PI * 2.0;
        double speed = genome.getDivisionImpulseStrength();

        double initialVx = Math.cos(angle) * speed;
        double initialVy = Math.sin(angle) * speed;

        Saprotroph saprotroph = new Saprotroph(
                IdGenerator.nextId(),
                clampX(requestDto.x()),
                clampY(requestDto.y()),
                initialVx,
                initialVy,
                initialEnergy,
                genome
        );

        world.getSaprotrophs().add(saprotroph);
    }

    private void performSimulationStep() {
        world.incrementTick();
        updateSaprotrophs();
        updateDeadCells();
        cleanupFoods();
        spawnPeriodicFood();
    }

    private void updateSaprotrophs() {
        List<Saprotroph> newborns = new ArrayList<>();
        List<DeadCell> newDeadCells = new ArrayList<>();

        for (Saprotroph saprotroph : world.getSaprotrophs()) {
            if (!saprotroph.isAlive()) {
                continue;
            }

            moveCell(saprotroph);
            applyViscosity(saprotroph);

            saprotroph.setEnergy(
                    saprotroph.getEnergy() - baseConfig.getSaprotrophBaseEnergyDecayPerTick()
            );

            for (Food food : world.getFoods()) {
                if (food.isConsumed()) {
                    continue;
                }

                double dx = saprotroph.getX() - food.getX();
                double dy = saprotroph.getY() - food.getY();
                double distanceSquared = dx * dx + dy * dy;
                double consumptionRadius = baseConfig.getFoodConsumptionRadius();

                if (distanceSquared <= consumptionRadius * consumptionRadius) {
                    double currentEnergy = saprotroph.getEnergy();
                    double maxEnergy = saprotroph.getGenome().getMaxEnergy();
                    double energyDeficit = maxEnergy - currentEnergy;

                    if (energyDeficit <= 0.0) {
                        continue;
                    }

                    double foodEnergy = food.getEnergy();

                    if (foodEnergy <= energyDeficit) {
                        saprotroph.setEnergy(currentEnergy + foodEnergy);
                        food.setConsumed(true);
                    } else {
                        saprotroph.setEnergy(maxEnergy);
                        food.setEnergy(foodEnergy - energyDeficit);
                    }
                }
            }

            if (saprotroph.getEnergy() <= baseConfig.getMinCellEnergy()) {
                saprotroph.setAlive(false);
                newDeadCells.add(entityFactory.createDeadCellFromSaprotroph(saprotroph));
                continue;
            }

            if (saprotroph.getEnergy() >= saprotroph.getGenome().getDivisionThreshold()) {
                List<Saprotroph> children = divideSaprotroph(saprotroph);

                if (!children.isEmpty()) {
                    newborns.addAll(children);
                    saprotroph.setAlive(false);
                }
            }
        }

        world.getSaprotrophs().addAll(newborns);
        world.getDeadCells().addAll(newDeadCells);
        world.getSaprotrophs().removeIf(saprotroph -> !saprotroph.isAlive());
    }

    private void updateDeadCells() {
        List<Food> foodsFromDeadCells = new ArrayList<>();

        Iterator<DeadCell> iterator = world.getDeadCells().iterator();
        while (iterator.hasNext()) {
            DeadCell deadCell = iterator.next();

            moveCell(deadCell);
            applyViscosity(deadCell);
            deadCell.incrementLifetimeTicks();

            if (deadCell.getLifetimeTicks() >= currentDeadCellLifetimeTicks()) {
                foodsFromDeadCells.add(
                        entityFactory.createFoodAtPosition(
                                deadCell.getX(),
                                deadCell.getY(),
                                deadCell.getEnergy()
                        )
                );
                iterator.remove();
            }
        }

        world.getFoods().addAll(foodsFromDeadCells);
    }

    private double currentFoodGenerationFrequencyMultiplier() {
        int intensity = currentFoodGenerationIntensity();

        if (intensity <= 0) {
            return 0.0;
        }

        double maxMultiplier = Math.max(1.0, baseConfig.getFoodGenerationMaxFrequencyMultiplier());
        double normalized = intensity / 50.0 - 1.0;

        return Math.pow(maxMultiplier, normalized);
    }

    private double currentFoodSpawnsPerTick() {
        return currentFoodGenerationFrequencyMultiplier() / 10.0;
    }

    private void spawnPeriodicFood() {
        double spawnsPerTick = currentFoodSpawnsPerTick();

        if (spawnsPerTick <= 0.0) {
            return;
        }

        int guaranteedSpawns = (int) Math.floor(spawnsPerTick);
        double fractionalPart = spawnsPerTick - guaranteedSpawns;

        for (int i = 0; i < guaranteedSpawns; i++) {
            world.getFoods().add(entityFactory.createRandomFood());
        }

        if (random.nextDouble() < fractionalPart) {
            world.getFoods().add(entityFactory.createRandomFood());
        }
    }

    private List<Saprotroph> divideSaprotroph(Saprotroph parent) {
        Genome firstGenome = genomeMutationService.copyGenomeWithPossibleMutation(parent.getGenome());
        Genome secondGenome = genomeMutationService.copyGenomeWithPossibleMutation(parent.getGenome());

        double firstDivisionImpulse = firstGenome.getDivisionImpulseStrength();
        double secondDivisionImpulse = secondGenome.getDivisionImpulseStrength();

        double firstImpulseEnergyCost =
                firstDivisionImpulse * baseConfig.getDivisionImpulseEnergyCostFactor();
        double secondImpulseEnergyCost =
                secondDivisionImpulse * baseConfig.getDivisionImpulseEnergyCostFactor();

        double remainingEnergy =
                parent.getEnergy() - firstImpulseEnergyCost - secondImpulseEnergyCost;

        double baseChildEnergy = remainingEnergy / 2.0;

        double firstChildEnergy = Math.min(baseChildEnergy, firstGenome.getMaxEnergy());
        double secondChildEnergy = Math.min(baseChildEnergy, secondGenome.getMaxEnergy());

        if (firstChildEnergy < baseConfig.getMinChildEnergyAfterDivision()
                || secondChildEnergy < baseConfig.getMinChildEnergyAfterDivision()) {
            return List.of();
        }

        double angle = random.nextDouble() * Math.PI * 2.0;
        double directionX = Math.cos(angle);
        double directionY = Math.sin(angle);

        double firstChildRadius = calculateSaprotrophRadius(
                firstChildEnergy,
                firstGenome.getDivisionThreshold()
        );
        double secondChildRadius = calculateSaprotrophRadius(
                secondChildEnergy,
                secondGenome.getDivisionThreshold()
        );

        double distanceBetweenCenters = firstChildRadius + secondChildRadius;
        double offsetFromParent = distanceBetweenCenters / 2.0;

        double firstChildX = parent.getX() + directionX * offsetFromParent;
        double firstChildY = parent.getY() + directionY * offsetFromParent;

        double secondChildX = parent.getX() - directionX * offsetFromParent;
        double secondChildY = parent.getY() - directionY * offsetFromParent;

        double firstChildVx = parent.getVx() + directionX * firstDivisionImpulse;
        double firstChildVy = parent.getVy() + directionY * firstDivisionImpulse;

        double secondChildVx = parent.getVx() - directionX * secondDivisionImpulse;
        double secondChildVy = parent.getVy() - directionY * secondDivisionImpulse;

        Saprotroph firstChild = new Saprotroph(
                com.hellengi.biolab.util.IdGenerator.nextId(),
                clampX(firstChildX),
                clampY(firstChildY),
                firstChildVx,
                firstChildVy,
                firstChildEnergy,
                firstGenome
        );

        Saprotroph secondChild = new Saprotroph(
                com.hellengi.biolab.util.IdGenerator.nextId(),
                clampX(secondChildX),
                clampY(secondChildY),
                secondChildVx,
                secondChildVy,
                secondChildEnergy,
                secondGenome
        );

        return List.of(firstChild, secondChild);
    }

    private double calculateSaprotrophRadius(double energy, double divisionThreshold) {
        double energyNorm = Math.min(1.0, energy / divisionThreshold);
        return baseConfig.getClientSaprotrophBaseRadius()
                + energyNorm * baseConfig.getClientSaprotrophRadiusScale();
    }

    private void moveCell(com.hellengi.biolab.model.Cell cell) {
        cell.move();

        if (cell.getX() < 0.0) {
            cell.setX(0.0);
            cell.setVx(-cell.getVx());
        } else if (cell.getX() > baseConfig.getWorldWidth()) {
            cell.setX(baseConfig.getWorldWidth());
            cell.setVx(-cell.getVx());
        }

        if (cell.getY() < 0.0) {
            cell.setY(0.0);
            cell.setVy(-cell.getVy());
        } else if (cell.getY() > baseConfig.getWorldHeight()) {
            cell.setY(baseConfig.getWorldHeight());
            cell.setVy(-cell.getVy());
        }
    }

    private void applyViscosity(com.hellengi.biolab.model.Cell cell) {
        double viscosityFactor = Math.max(0.0, Math.min(1.0, baseConfig.getCellViscosityFactor()));

        cell.setVx(cell.getVx() * viscosityFactor);
        cell.setVy(cell.getVy() * viscosityFactor);

        if (Math.abs(cell.getVx()) < 0.001) {
            cell.setVx(0.0);
        }

        if (Math.abs(cell.getVy()) < 0.001) {
            cell.setVy(0.0);
        }
    }

    private double clampX(double x) {
        return Math.max(0.0, Math.min(baseConfig.getWorldWidth(), x));
    }

    private double clampY(double y) {
        return Math.max(0.0, Math.min(baseConfig.getWorldHeight(), y));
    }

    private void cleanupFoods() {
        world.getFoods().removeIf(Food::isConsumed);
    }

    private void loadSnapshot(SavedWorldSnapshotDto snapshot) {
        WorldStateDto savedWorld = snapshot.world();
        SimulationConfigDto savedConfig = snapshot.config();

        runtimeOverrides.loadFromConfig(savedConfig);

        world.setRunning(savedWorld.running());
        world.setTick(savedWorld.tick());
        world.clear();

        for (SaprotrophDto saprotrophDto : savedWorld.saprotrophs()) {
            world.getSaprotrophs().add(fromSaprotrophDto(saprotrophDto));
        }

        for (DeadCellDto deadCellDto : savedWorld.deadCells()) {
            world.getDeadCells().add(fromDeadCellDto(deadCellDto));
        }

        for (FoodDto foodDto : savedWorld.foods()) {
            world.getFoods().add(fromFoodDto(foodDto));
        }

        world.setLastSimulationStepTimeMs(System.currentTimeMillis());
    }

    private Saprotroph fromSaprotrophDto(SaprotrophDto dto) {
        Genome genome = fromGenomeDto(dto.genome());

        Saprotroph saprotroph = new Saprotroph(
                dto.id(),
                dto.x(),
                dto.y(),
                dto.vx(),
                dto.vy(),
                dto.energy(),
                genome
        );
        saprotroph.setAlive(dto.alive());
        return saprotroph;
    }

    private DeadCell fromDeadCellDto(DeadCellDto dto) {
        return new DeadCell(
                dto.id(),
                dto.x(),
                dto.y(),
                dto.vx(),
                dto.vy(),
                dto.energy(),
                dto.lifetimeTicks()
        );
    }

    private Food fromFoodDto(FoodDto dto) {
        Food food = new Food(
                dto.id(),
                dto.x(),
                dto.y(),
                dto.energy()
        );
        food.setConsumed(dto.consumed());
        return food;
    }

    private Genome fromGenomeDto(GenomeDto dto) {
        return new Genome(
                dto.divisionThreshold(),
                dto.divisionImpulseStrength(),
                dto.colorHue(),
                dto.lightness(),
                dto.maxEnergy()
        );
    }
}