package com.hellengi.biolab.domain.model;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.organelle.ChloroplastsOrganelle;
import com.hellengi.biolab.domain.model.organelle.FlagellaOrganelle;
import com.hellengi.biolab.domain.model.organelle.CytosolOrganelle;
import com.hellengi.biolab.domain.model.organelle.LysosomeOrganelle;
import com.hellengi.biolab.domain.model.organelle.MembraneOrganelle;
import com.hellengi.biolab.domain.model.organelle.NucleusOrganelle;
import com.hellengi.biolab.domain.model.organelle.Organelle;
import com.hellengi.biolab.util.IdGenerator;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.function.DoubleConsumer;
import java.util.function.DoubleSupplier;
import java.util.function.IntFunction;
import java.util.function.ToDoubleFunction;
import java.util.function.ToIntFunction;

import static com.hellengi.biolab.util.Utils.EPSILON;
import static com.hellengi.biolab.util.Utils.clamp01;
import static com.hellengi.biolab.util.Utils.avoidZero;
import static com.hellengi.biolab.util.Utils.wrapDegrees;

@Setter
@Getter
public class Cell {
    private static final int MAX_EVENTS = 20;
    private static final int MAX_LYSOSOME_LAYOUT_ATTEMPTS = 10;
    private static final double LYSOSOME_LAYOUT_SMOOTHING = 1.10;
    private static final double NUCLEUS_LAYOUT_SMOOTHING = 0.82;
    private static final double LYSOSOME_FOOD_RADIUS_FACTOR = 1.38;
    private static final double LYSOSOME_MAX_RADIUS_FACTOR = 0.28;


    private final long id;
    private final YamlConfig config;

    private double x = 0;
    private double y = 0;
    private double vx = 0;
    private double vy = 0;
    private double angularVelocity = 0.0;
    private double directionAngle = 0.0;
    private double energy = 0;
    private Genome genome;
    private final List<Event> events = new ArrayList<>();
    private final List<LysosomeSlot> lysosomeSlots = new ArrayList<>();
    private final List<FlagellumSlot> flagellumSlots = new ArrayList<>();
    private boolean markedForRemoval = false;
    private boolean alive = true;
    private double lifetimeTicks = 0.0;
    private double mass = EPSILON;

    private double nucleusDamage = 0.0;
    /** Cytosol damage. Kept as cellDamage in DTOs for minimal API churn. */
    private double cellDamage = 0.0;
    private double cpDamage = 0.0;
    private double membraneDamage = 0.0;
    private double lastEnergyProduction = 0.0;
    private double lastEnergyConsumption = 0.0;
    private double lastCpPhotoDamageRate = 0.0;
    private double lastNucleusDamageRate = 0.0;
    private double lastCellDamageRate = 0.0;
    private double lastNucleusRepairRate = 0.0;
    private double lastNucleusRepairEnergyCostRate = 0.0;
    private double lastEnergyAvailability = 1.0;
    private double lastEnergyDemand = 0.0;
    private double lastCpRepairRate = 0.0;
    private double lastCellRepairRate = 0.0;
    private double lastMembraneDamageRate = 0.0;
    private double lastMembraneRepairRate = 0.0;
    private double lastMembraneRepairEnergyCostRate = 0.0;
    private double lastRepairEnergyCostRate = 0.0;
    private double lastDigestionEnergyProduction = 0.0;
    private double lastDigestionEnergyCostRate = 0.0;
    private double lastLysosomeDamageRate = 0.0;
    private double lastLysosomeRepairRate = 0.0;
    private double lastLysosomeRepairEnergyCostRate = 0.0;
    private double lastFlagellumDamageRate = 0.0;
    private double lastFlagellumRepairRate = 0.0;
    private double lastFlagellumRepairEnergyCostRate = 0.0;
    private double lastFlagellumEnergyCostRate = 0.0;
    private double nucleusLayoutX = 0.0;
    private double nucleusLayoutY = 0.0;
    private double nucleusLayoutTargetX = 0.0;
    private double nucleusLayoutTargetY = 0.0;
    private String internalLayoutSignature = "";

    public Cell(long id, YamlConfig config) {
        this.id = id;
        this.config = config;
        IdGenerator.advanceBeyond(id);
    }

    public Cell(YamlConfig config) {
        this.id = IdGenerator.nextId();
        this.config = config;
    }

    public void move(double tickScale) {
        this.x += this.vx * tickScale;
        this.y += this.vy * tickScale;
        this.directionAngle = wrapDegrees(this.directionAngle + Math.toDegrees(this.angularVelocity * tickScale));
    }

    public void addLifetimeTicks(double ticks) {
        this.lifetimeTicks += ticks;
    }

    public void setPosition(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public void setVelocity(double vx, double vy) {
        this.vx = vx;
        this.vy = vy;
    }

    public void setEnergy(double energy) {
        this.energy = Math.max(0.0, Double.isFinite(energy) ? energy : 0.0);
    }

    public void setMass() {
        mass = getMass();
    }

    public void setGenome(Genome genome) {
        this.genome = genome;
        syncLysosomeSlotsToGenome();
        syncFlagellumSlotsToGenome();
    }

    public void setLysosomeSlots(List<LysosomeSlot> slots) {
        lysosomeSlots.clear();
        int capacity = getLysosomeCapacity();
        if (slots != null) {
            for (LysosomeSlot slot : slots) {
                if (lysosomeSlots.size() >= capacity) break;
                LysosomeSlot copy = new LysosomeSlot(lysosomeSlots.size(), slot.getFoodId(), slot.getDamage());
                copy.setFoodEnergy(slot.getFoodEnergy());
                copy.setFoodRadius(slot.getFoodRadius());
                copy.setFoodInsideLysosome(slot.isFoodInsideLysosome());
                copy.setLayout(slot.getLayoutX(), slot.getLayoutY(), slot.getLayoutRadius(), slot.getLayoutRotation());
                copy.setTargetLayout(slot.getTargetLayoutX(), slot.getTargetLayoutY(), slot.getTargetLayoutRadius(), slot.getTargetLayoutRotation());
                copy.setTargetFoodRadius(slot.getTargetFoodRadius());
                lysosomeSlots.add(copy);
            }
        }
        syncLysosomeSlotsToGenome();
    }
    public void setFlagellumSlots(List<FlagellumSlot> slots) {
        flagellumSlots.clear();
        int capacity = getFlagellumCapacity();
        if (slots != null) {
            for (FlagellumSlot slot : slots) {
                if (flagellumSlots.size() >= capacity) break;
                FlagellumSlot copy = new FlagellumSlot(flagellumSlots.size(), slot.getDamage());
                copy.rememberPhysics(
                        slot.getLastForce(),
                        slot.getLastTorque(),
                        slot.getLastBaseX(),
                        slot.getLastBaseY(),
                        slot.getLastDirectionX(),
                        slot.getLastDirectionY(),
                        slot.getLastEnergyCostRate()
                );
                copy.rememberDamageRate(slot.getLastDamageRate());
                copy.rememberRepairRates(slot.getLastRepairRate(), slot.getLastRepairEnergyCostRate());
                flagellumSlots.add(copy);
            }
        }
        syncFlagellumSlotsToGenome();
    }


    public void resetLysosomeSlotRates() {
        for (LysosomeSlot slot : lysosomeSlots) {
            slot.clearRates();
        }
    }

    public void resetFlagellumSlotRates() {
        lastFlagellumEnergyCostRate = 0.0;
        for (FlagellumSlot slot : flagellumSlots) {
            slot.clearRates();
        }
    }


    public void setAllLysosomeDamage(double damage) {
        double value = clamp01(damage);
        for (LysosomeSlot slot : lysosomeSlots) {
            slot.setDamage(value);
        }
    }

    public void setAllFlagellumDamage(double damage) {
        double value = clamp01(damage);
        for (FlagellumSlot slot : flagellumSlots) {
            slot.setDamage(value);
        }
    }

    public List<Organelle> getOrganelles() {
        return genome != null ? genome.organelles() : List.of();
    }

    public List<ScalarDamageChannel> scalarDamageChannels() {
        return List.of(
                new ScalarDamageChannel("nucleus", this::getNucleusDamage, this::setNucleusDamage),
                new ScalarDamageChannel("cytosol", this::getCellDamage, this::setCellDamage),
                new ScalarDamageChannel("chloroplast", this::getCpDamage, this::setCpDamage),
                new ScalarDamageChannel("membrane", this::getMembraneDamage, this::setMembraneDamage)
        );
    }

    public List<SlotDamageChannel<?>> slotDamageChannels() {
        List<SlotDamageChannel<?>> channels = new ArrayList<>();
        if (hasLysosomes()) {
            channels.add(new SlotDamageChannel<>(
                    "lysosome",
                    lysosomeSlots,
                    this::getLysosomeSlot,
                    this::getAverageLysosomeDamage,
                    LysosomeSlot::getIndex,
                    LysosomeSlot::getDamage,
                    LysosomeSlot::setDamage
            ));
        }
        if (hasFlagella()) {
            channels.add(new SlotDamageChannel<>(
                    "flagellum",
                    flagellumSlots,
                    this::getFlagellumSlot,
                    this::getAverageFlagellumDamage,
                    FlagellumSlot::getIndex,
                    FlagellumSlot::getDamage,
                    FlagellumSlot::setDamage
            ));
        }
        return channels;
    }


    public void rememberMetabolism(
            double energyProduction,
            double energyConsumption,
            double energyAvailability,
            double energyDemand,
            double cpPhotoDamageRate,
            double nucleusDamageRate,
            double cellDamageRate,
            double nucleusRepairRate,
            double nucleusRepairEnergyCostRate,
            double cpRepairRate,
            double cellRepairRate,
            double membraneDamageRate,
            double membraneRepairRate,
            double membraneRepairEnergyCostRate,
            double repairEnergyCostRate
    ) {
        this.lastEnergyProduction = energyProduction;
        this.lastEnergyConsumption = energyConsumption;
        this.lastEnergyAvailability = clamp01(energyAvailability);
        this.lastEnergyDemand = Math.max(0.0, energyDemand);
        this.lastCpPhotoDamageRate = cpPhotoDamageRate;
        this.lastNucleusDamageRate = nucleusDamageRate;
        this.lastCellDamageRate = cellDamageRate;
        this.lastNucleusRepairRate = nucleusRepairRate;
        this.lastNucleusRepairEnergyCostRate = nucleusRepairEnergyCostRate;
        this.lastCpRepairRate = cpRepairRate;
        this.lastCellRepairRate = cellRepairRate;
        this.lastMembraneDamageRate = membraneDamageRate;
        this.lastMembraneRepairRate = membraneRepairRate;
        this.lastMembraneRepairEnergyCostRate = membraneRepairEnergyCostRate;
        this.lastRepairEnergyCostRate = repairEnergyCostRate;
    }

    public void rememberDigestion(
            double digestionEnergyProduction,
            double digestionEnergyCostRate,
            double lysosomeDamageRate
    ) {
        this.lastDigestionEnergyProduction = digestionEnergyProduction;
        this.lastDigestionEnergyCostRate = digestionEnergyCostRate;
        this.lastLysosomeDamageRate = lysosomeDamageRate;
    }

    public void rememberLysosomeRepair(double repairRate, double repairEnergyCostRate) {
        this.lastLysosomeRepairRate = repairRate;
        this.lastLysosomeRepairEnergyCostRate = repairEnergyCostRate;
    }

    public void rememberFlagellumRepair(double damageRate, double repairRate, double repairEnergyCostRate) {
        this.lastFlagellumDamageRate = damageRate;
        this.lastFlagellumRepairRate = repairRate;
        this.lastFlagellumRepairEnergyCostRate = repairEnergyCostRate;
    }

    public void addFlagellumEnergyCostRate(double energyCostRate) {
        this.lastFlagellumEnergyCostRate += Math.max(0.0, energyCostRate);
    }

    public double calculateEnergyProduction(double irradiance) {
        if (!hasChloroplasts()) {
            return 0.0;
        }
        double usefulLight = calculateUsefulLight(irradiance);
        return usefulLight * config.getCell().getPhotosynthesisEnergyYield();
    }

    public double calculateEnergyConsumption() {
        if (genome == null) return 0.0;
        YamlConfig.CellProperties c = config.getCell();
        return c.getNucleoidEnergyConsumption()
                + cytosol().energyConsumption(c, getCytosolMass())
                + membrane().energyConsumption(c, getMembraneLength())
                + chloroplasts().energyConsumption(c)
                + lysosomes().energyConsumption(c)
                + lastFlagellumEnergyCostRate
                + c.getEnergyDecayPerTick();
    }

    public double calculateCpPhotoDamageRate(double irradiance) {
        return chloroplasts().photoDamageRate(this, config.getCell(), irradiance, cpDamage);
    }

    public double calculateCellDamageRate(double irradiance) {
        YamlConfig.CellProperties c = config.getCell();
        double directPhotoDamage = Math.max(0.0, irradiance)
                * c.getCellPhotoDamageFactor()
                * (1.0 - getMelaninProtection());

        double cpLeakDamage = DamageModel.leakDamageRate(
                cpDamage,
                c.getCpDamageLeakThreshold(),
                c.getCpDamageLeakFactor()
        );

        double lysosomeLeakDamage = calculateLysosomeLeakDamageRate();

        return directPhotoDamage + cpLeakDamage + lysosomeLeakDamage;
    }

    public double calculateLysosomeLeakDamageRate() {
        if (!hasLysosomes()) return 0.0;
        YamlConfig.CellProperties c = config.getCell();
        double enzyme = lysosomes().enzymeActivity01();
        double total = 0.0;
        for (LysosomeSlot slot : lysosomeSlots) {
            total += DamageModel.leakDamageRate(
                    slot.getDamage(),
                    c.getLysosomeLeakThreshold(),
                    c.getLysosomeLeakDamageFactor(),
                    0.35 + 0.65 * enzyme
            );
        }
        return total;
    }

    public boolean canDivide() {
        return alive
                && energy >= getDivisionEnergyThreshold()
                && nucleusDamage < config.getCell().getCellDivDamageMax();
    }

    public double getDivisionEnergyThreshold() {
        return nucleus().divisionEnergyThreshold(this);
    }

    public double getDivisionEnergyCost() {
        YamlConfig.CellProperties c = config.getCell();
        double impulseCost = nucleus().divisionImpulseCost(this);
        double cytosolCost = getCytosolMass() * c.getCytosolDivEnergyCostFactor();
        double membraneCost = getMembraneLength() * c.getMembraneDivEnergyCostFactor();
        double cpCost = chloroplasts().divisionEnergyCost(c);
        double lysosomeCost = lysosomes().divisionEnergyCost(c);
        double flagellumCost = flagella().divisionEnergyCost(c);
        return impulseCost + c.getNucleoidDivEnergyCost() + cytosolCost + membraneCost + cpCost + lysosomeCost + flagellumCost;
    }

    public boolean isLethallyDamaged() {
        return cellDamage >= config.getCell().getCellDeathDamageThreshold();
    }

    public double getMass() {
        if (!isAlive()) {
            return mass;
        }
        return getOrganelles().stream()
                .filter(Organelle::present)
                .mapToDouble(organelle -> organelle.mass(this, config.getCell()))
                .sum();
    }

    public double getDensity() {
        double area = Math.PI * getRadius() * getRadius();
        return getMass() / avoidZero(area);
    }

    public double getRadius() {
        double area = Math.max(EPSILON, getCellArea());
        return Math.max(config.getCell().getBaseRadius(), Math.sqrt(area / Math.PI));
    }

    public double getCellArea() {
        if (genome == null) {
            return Math.PI * config.getCell().getBaseRadius() * config.getCell().getBaseRadius();
        }
        // CellArea = NcArea + CtArea + CpTotalArea + LysosomeTotalArea.
        // The membrane is derived from final radius/length and is not added here;
        // BaseRadius is enforced in getRadius() as the lower physical size limit.
        return nucleus().area(this, config.getCell())
                + cytosol().area(this, config.getCell())
                + chloroplasts().area(this, config.getCell())
                + getLysosomeTotalArea();
    }

    public double getMaxEnergy() {
        return genome != null ? genome.getMaxEnergy() : config.getCell().getStartEnergy();
    }

    public double getNucleoidMass() {
        return nucleus().mass(this, config.getCell());
    }

    public double getNucleoidArea() {
        return nucleus().area(this, config.getCell());
    }

    public double getCytosolMass() {
        return cytosol().mass(this, config.getCell());
    }

    public double getCytosolArea() {
        return cytosol().area(this, config.getCell());
    }

    public double getMembraneLength() {
        return 2.0 * Math.PI * getRadius();
    }

    public double getMembraneMass() {
        return membrane().mass(this, config.getCell());
    }

    public double getMembraneArea() {
        return membrane().area(this, config.getCell());
    }

    public double getCpAmount() {
        return chloroplasts().activeAmount();
    }

    public double getCpTotalMass() {
        return chloroplasts().totalMass(config.getCell());
    }

    public double getCpTotalArea() {
        return chloroplasts().totalArea(config.getCell());
    }

    public int getLysosomeAmount() {
        return lysosomes().activeAmount();
    }

    public double getLysosomeTotalMass() {
        return lysosomes().totalMass(config.getCell());
    }

    public double getLysosomeTotalArea() {
        if (genome == null || !lysosomes().present()) return 0.0;
        double total = 0.0;
        double baseSlotArea = Math.max(0.0, config.getCell().getLysosomeAreaFactor());
        for (LysosomeSlot slot : lysosomeSlots) {
            double layoutArea = slot.getLayoutRadius() > 0.0
                    ? Math.PI * slot.getLayoutRadius() * slot.getLayoutRadius()
                    : baseSlotArea;
            total += Math.max(baseSlotArea, layoutArea);
        }
        return total;
    }

    public double getLysosomeEnzymeActivity01() {
        return genome != null ? lysosomes().enzymeActivity01() : 0.0;
    }

    public int getLysosomeCapacity() {
        return genome != null ? lysosomes().activeAmount() : 0;
    }

    public int getOccupiedLysosomeSlots() {
        int occupied = 0;
        for (LysosomeSlot slot : lysosomeSlots) {
            if (slot.isOccupied()) occupied++;
        }
        return occupied;
    }

    public int getFreeLysosomeSlotIndex() {
        if (!hasLysosomes()) return -1;
        if (getAverageLysosomeDamage() > config.getCell().getLysosomeCaptureDamageThreshold()) return -1;
        for (LysosomeSlot slot : lysosomeSlots) {
            if (!slot.isOccupied() && slot.getDamage() < 1.0) {
                return slot.getIndex();
            }
        }
        return -1;
    }

    public boolean hasFreeLysosomeSlot() {
        return getFreeLysosomeSlotIndex() >= 0;
    }

    public LysosomeSlot getLysosomeSlot(int index) {
        if (index < 0 || index >= lysosomeSlots.size()) return null;
        return lysosomeSlots.get(index);
    }

    public double getAverageLysosomeDamage() {
        if (lysosomeSlots.isEmpty()) return 0.0;
        return lysosomeSlots.stream().mapToDouble(LysosomeSlot::getDamage).average().orElse(0.0);
    }

    public double getMaxLysosomeDamage() {
        return lysosomeSlots.stream().mapToDouble(LysosomeSlot::getDamage).max().orElse(0.0);
    }

    public double getLysosomeDamage() {
        return getAverageLysosomeDamage();
    }

    public double getLysosomeTargetX(int index) {
        LysosomeSlot slot = getLysosomeSlot(index);
        if (slot == null) return x;
        return x + rotatedInternalOffsetX(slot.getLayoutX(), slot.getLayoutY());
    }

    public double getLysosomeTargetY(int index) {
        LysosomeSlot slot = getLysosomeSlot(index);
        if (slot == null) return y;
        return y + rotatedInternalOffsetY(slot.getLayoutX(), slot.getLayoutY());
    }

    private double rotatedInternalOffsetX(double localX, double localY) {
        double angle = Math.toRadians(directionAngle);
        return localX * Math.cos(angle) - localY * Math.sin(angle);
    }

    private double rotatedInternalOffsetY(double localX, double localY) {
        double angle = Math.toRadians(directionAngle);
        return localX * Math.sin(angle) + localY * Math.cos(angle);
    }

    public int getFlagellumCapacity() {
        return genome != null ? flagella().activeAmount() : 0;
    }

    public boolean hasFlagella() {
        return genome != null && flagella().present() && !flagellumSlots.isEmpty();
    }

    public int getFlagellumAmount() {
        return getFlagellumCapacity();
    }

    public FlagellumSlot getFlagellumSlot(int index) {
        if (index < 0 || index >= flagellumSlots.size()) return null;
        return flagellumSlots.get(index);
    }

    public double getAverageFlagellumDamage() {
        if (flagellumSlots.isEmpty()) return 0.0;
        return flagellumSlots.stream().mapToDouble(FlagellumSlot::getDamage).average().orElse(0.0);
    }

    public double getFlagellumLength() {
        return getFlagellumLength(0);
    }

    public double getFlagellumLength(int index) {
        return getRadius() * flagella().localLengthToRadiusFactor(index, config.getCell());
    }

    public double getFlagellumThickness() {
        return getRadius() * flagella().thicknessToRadiusFactor(config.getCell());
    }

    public double getFlagellumBaseLocalX(int index) {
        double angle = flagellumAttachmentAngle(index);
        return Math.cos(angle) * getRadius();
    }

    public double getFlagellumBaseLocalY(int index) {
        double angle = flagellumAttachmentAngle(index);
        return Math.sin(angle) * getRadius();
    }

    public double getFlagellumDirectionX(int index) {
        double angle = flagellumThrustAngle(index);
        return Math.cos(angle);
    }

    public double getFlagellumDirectionY(int index) {
        double angle = flagellumThrustAngle(index);
        return Math.sin(angle);
    }

    public double flagellumAttachmentAngle(int index) {
        return Math.toRadians(directionAngle - 90.0) + flagella().attachmentOffsetRadians(index, config.getCell());
    }

    public double flagellumThrustAngle(int index) {
        return Math.toRadians(directionAngle - 90.0) + flagella().orientationOffsetRadians(index);
    }

    public double flagellumMotorPower01(int index) {
        return genome != null ? flagella().localActivity01(index) : 0.0;
    }

    public double flagellumMotorPower(int index) {
        return flagellumMotorPower01(index) * 100.0;
    }

    public double getNucleusRadius() {
        return Math.max(0.0, getRadius() * 0.28);
    }

    public double getNucleusTargetX() {
        return x + nucleusLayoutX;
    }

    public double getNucleusTargetY() {
        return y + nucleusLayoutY;
    }

    public double getCytosolOpacity() {
        double pigmentDepth = getPigmentOpticalDepth();
        return clamp01(config.getCell().getBaseCellOpacity()
                + config.getCell().getPigmentCellOpacityFactor() * (1.0 - Math.exp(-pigmentDepth)));
    }

    public double getCellOpacity() {
        double cytosolOpacity = getCytosolOpacity();
        double membraneOpacity = getMembraneOpacity();
        return clamp01(1.0 - (1.0 - cytosolOpacity) * (1.0 - membraneOpacity));
    }

    public double getMembraneOpacity() {
        return membrane().opacity(config.getCell());
    }

    public double getOpacity() {
        return getCellOpacity();
    }

    public double getMembraneLightTransmittance() {
        return membrane().lightTransmittance(config.getCell());
    }

    public double getFluorescenceBrightness() {
        if (!isAlive() || genome == null) {
            return 0.0;
        }
        return getGfp01()
                * Math.max(0.0, config.getLight().getCellFluorescenceMaxBrightness())
                * getMembraneLightTransmittance();
    }

    public double getLightCapture() {
        return chloroplasts().lightCapture(this, config.getCell());
    }

    public double getPigmentOpticalDepth() {
        return chloroplasts().pigmentOpticalDepth(this, config.getCell());
    }

    public double calculateCapturedLight(double irradiance) {
        return chloroplasts().capturedLight(this, config.getCell(), irradiance);
    }

    public double calculatePhotochemicalLight(double irradiance) {
        return chloroplasts().photochemicalLight(this, config.getCell(), irradiance);
    }

    public double calculatePhotosynthesisCapacity() {
        return chloroplasts().photosynthesisCapacity(config.getCell(), cpDamage);
    }

    public double calculateUsefulLight(double irradiance) {
        return chloroplasts().usefulLight(this, config.getCell(), irradiance, cpDamage);
    }

    public double calculateExcessLight(double irradiance) {
        return chloroplasts().excessLight(this, config.getCell(), irradiance, cpDamage);
    }

    public double getChlorophyllLightShare() {
        return chloroplasts().chlorophyllLightShare(config.getCell());
    }

    public double getCarotProtection() {
        return chloroplasts().carotProtection(config.getCell());
    }

    public double getMelaninProtection() {
        return membrane().melaninProtection(config.getCell());
    }

    public double getRepairCapacity() {
        return config.getCell().getRepairCapacityFactor()
                * getCytosolMass()
                / Math.max(getMass(), EPSILON)
                * DamageModel.performance(cellDamage);
    }

    public boolean hasChloroplasts() {
        return genome != null && chloroplasts().present();
    }

    public boolean hasLysosomes() {
        return genome != null && lysosomes().present() && !lysosomeSlots.isEmpty();
    }

    public double getGfp01() {
        return genome != null ? cytosol().gfp01() : 0.0;
    }

    public double getMelanin01() {
        return genome != null ? membrane().melanin01() : 0.0;
    }

    public double getChlorophyll01() {
        return genome != null ? chloroplasts().chlorophyll01() : 0.0;
    }

    public double getCarotenoids01() {
        return genome != null ? chloroplasts().carotenoids01() : 0.0;
    }

    public NucleusOrganelle nucleus() {
        return genome.getNucleus();
    }

    public CytosolOrganelle cytosol() {
        return genome.getCytosol();
    }

    public MembraneOrganelle membrane() {
        return genome.getMembrane();
    }

    public ChloroplastsOrganelle chloroplasts() {
        return genome.getChloroplasts();
    }

    public LysosomeOrganelle lysosomes() {
        return genome.getLysosomes();
    }

    public FlagellaOrganelle flagella() {
        return genome.getFlagella();
    }

    public void addEvent(Event event) {
        events.add(event);
        while (events.size() > MAX_EVENTS) {
            events.removeFirst();
        }
    }

    public void setEvents(List<Event> events) {
        this.events.clear();
        if (events != null) {
            this.events.addAll(events);
        }
    }

    public void assignMissingEventTimes(double time) {
        for (Event event : events) {
            if (!event.hasTime()) {
                event.setTime(time);
            }
        }
    }

    public void removeExpiredEvents(double time) {
        events.removeIf(event -> event.isExpired(time));
    }

    public void updateInternalLayout(double tickScale) {
        syncLysosomeSlotsToGenome();
        if (lysosomeSlots.isEmpty()) {
            nucleusLayoutTargetX = 0.0;
            nucleusLayoutTargetY = 0.0;
            internalLayoutSignature = "";
        } else {
            String signature = internalLayoutSignature();
            if (!signature.equals(internalLayoutSignature)) {
                applyInternalLayoutTarget(solveInternalLayout(), signature, false);
            }
        }

        double lyAlpha = smoothingAlpha(LYSOSOME_LAYOUT_SMOOTHING, tickScale);
        double nucleusAlpha = smoothingAlpha(NUCLEUS_LAYOUT_SMOOTHING, tickScale);

        nucleusLayoutX += (nucleusLayoutTargetX - nucleusLayoutX) * nucleusAlpha;
        nucleusLayoutY += (nucleusLayoutTargetY - nucleusLayoutY) * nucleusAlpha;

        for (LysosomeSlot slot : lysosomeSlots) {
            if (!slot.hasTargetLayout()) continue;
            slot.setLayout(
                    slot.getLayoutX() + (slot.getTargetLayoutX() - slot.getLayoutX()) * lyAlpha,
                    slot.getLayoutY() + (slot.getTargetLayoutY() - slot.getLayoutY()) * lyAlpha,
                    slot.getLayoutRadius() + (slot.getTargetLayoutRadius() - slot.getLayoutRadius()) * lyAlpha,
                    slot.getLayoutRotation() + (slot.getTargetLayoutRotation() - slot.getLayoutRotation()) * lyAlpha
            );
        }
    }

    public boolean hasInternalLayoutInitialized() {
        if (genome == null || lysosomeSlots.isEmpty()) {
            return true;
        }
        if (!Double.isFinite(nucleusLayoutX) || !Double.isFinite(nucleusLayoutY)) {
            return false;
        }
        if (!internalLayoutSignature().equals(internalLayoutSignature)) {
            return false;
        }
        for (LysosomeSlot slot : lysosomeSlots) {
            if (!slot.hasLayout() || !slot.hasTargetLayout()) {
                return false;
            }
        }
        return true;
    }

    public void ensureInternalLayoutInitialized() {
        syncLysosomeSlotsToGenome();
        if (lysosomeSlots.isEmpty()) {
            nucleusLayoutX = 0.0;
            nucleusLayoutY = 0.0;
            nucleusLayoutTargetX = 0.0;
            nucleusLayoutTargetY = 0.0;
            internalLayoutSignature = "";
            return;
        }

        String signature = internalLayoutSignature();
        boolean missingLayout = !Double.isFinite(nucleusLayoutX) || !Double.isFinite(nucleusLayoutY);
        for (LysosomeSlot slot : lysosomeSlots) {
            if (!slot.hasLayout() || !slot.hasTargetLayout()) {
                missingLayout = true;
                break;
            }
        }

        if (missingLayout || !signature.equals(internalLayoutSignature)) {
            applyInternalLayoutTarget(solveInternalLayout(), signature, true);
        }
    }

    private void applyInternalLayoutTarget(InternalLayout layout, String signature, boolean immediate) {
        nucleusLayoutTargetX = layout.nucleusX;
        nucleusLayoutTargetY = layout.nucleusY;
        if (immediate) {
            nucleusLayoutX = layout.nucleusX;
            nucleusLayoutY = layout.nucleusY;
        }
        for (int i = 0; i < lysosomeSlots.size(); i++) {
            LysosomeSlot slot = lysosomeSlots.get(i);
            LayoutCircle target = layout.lysosomes[i];
            if (target == null) continue;
            slot.setTargetLayout(target.x, target.y, target.r, target.rotation);
            if (immediate || !slot.hasLayout()) {
                slot.setLayout(target.x, target.y, target.r, target.rotation);
            }
        }
        internalLayoutSignature = signature;
    }

    private String internalLayoutSignature() {
        StringBuilder signature = new StringBuilder();
        signature.append(lysosomeSlots.size()).append('|')
                .append(Math.round(cellAreaWithoutLysosomes() * 0.25));
        for (LysosomeSlot slot : lysosomeSlots) {
            double desiredRadiusInput = slot.isOccupied()
                    ? Math.max(slot.getFoodRadius(), slot.getTargetFoodRadius())
                    : 0.0;
            signature.append('|')
                    .append(slot.isOccupied() ? '1' : '0')
                    .append(slot.isFoodInsideLysosome() ? 'i' : 't')
                    .append(Math.round(desiredRadiusInput * 4.0))
                    .append(':')
                    .append(Math.round(slot.getDamage() * 20.0));
        }
        return signature.toString();
    }

    private void syncLysosomeSlotsToGenome() {
        int capacity = getLysosomeCapacity();
        while (lysosomeSlots.size() > capacity) {
            lysosomeSlots.removeLast();
        }
        while (lysosomeSlots.size() < capacity) {
            lysosomeSlots.add(new LysosomeSlot(lysosomeSlots.size()));
        }
        for (int i = 0; i < lysosomeSlots.size(); i++) {
            lysosomeSlots.get(i).setIndex(i);
        }
        if (capacity == 0) {
            nucleusLayoutX = 0.0;
            nucleusLayoutY = 0.0;
            nucleusLayoutTargetX = 0.0;
            nucleusLayoutTargetY = 0.0;
            internalLayoutSignature = "";
        }
    }

    private void syncFlagellumSlotsToGenome() {
        int capacity = getFlagellumCapacity();
        while (flagellumSlots.size() > capacity) {
            flagellumSlots.removeLast();
        }
        while (flagellumSlots.size() < capacity) {
            flagellumSlots.add(new FlagellumSlot(flagellumSlots.size()));
        }
        for (int i = 0; i < flagellumSlots.size(); i++) {
            flagellumSlots.get(i).setIndex(i);
        }
    }

    private InternalLayout solveInternalLayout() {
        int count = Math.min(6, Math.max(0, lysosomeSlots.size()));
        double cellRadius = Math.max(config.getCell().getBaseRadius(), getRadius());
        double[] lysosomeRadii = new double[count];
        for (int i = 0; i < count; i++) {
            lysosomeRadii[i] = desiredLysosomeLayoutRadius(i, cellRadius);
        }
        cellRadius = predictedCellRadiusWith(lysosomeRadii);
        for (int i = 0; i < count; i++) {
            lysosomeRadii[i] = desiredLysosomeLayoutRadius(i, cellRadius);
        }
        cellRadius = predictedCellRadiusWith(lysosomeRadii);
        double nucleusRadius = Math.max(0.0, cellRadius * 0.28);
        double margin = Math.max(0.22, cellRadius * 0.028);

        InternalLayout best = null;
        double bestScore = Double.POSITIVE_INFINITY;
        for (LayoutCircle nucleusCandidate : nucleusCandidates(cellRadius, nucleusRadius, margin)) {
            InternalLayout layout = placeLysosomesForNucleus(nucleusCandidate, lysosomeRadii, cellRadius, margin);
            if (layout.score < bestScore) {
                bestScore = layout.score;
                best = layout;
            }
        }
        return best != null ? best : centeredFallback(count, lysosomeRadii, cellRadius, nucleusRadius, margin);
    }

    private double predictedCellRadiusWith(double[] lysosomeRadii) {
        double baseArea = cellAreaWithoutLysosomes();
        double baseSlotArea = Math.max(0.0, config.getCell().getLysosomeAreaFactor());
        double lysosomeArea = 0.0;
        for (double radius : lysosomeRadii) {
            lysosomeArea += Math.max(baseSlotArea, Math.PI * radius * radius);
        }
        return Math.max(config.getCell().getBaseRadius(), Math.sqrt(Math.max(EPSILON, baseArea + lysosomeArea) / Math.PI));
    }

    private double cellAreaWithoutLysosomes() {
        if (genome == null) {
            return Math.PI * config.getCell().getBaseRadius() * config.getCell().getBaseRadius();
        }
        return nucleus().area(this, config.getCell())
                + cytosol().area(this, config.getCell())
                + chloroplasts().area(this, config.getCell());
    }

    private List<LayoutCircle> nucleusCandidates(double cellRadius, double nucleusRadius, double margin) {
        List<LayoutCircle> candidates = new ArrayList<>();
        candidates.add(new LayoutCircle(0.0, 0.0, nucleusRadius, 0.0));
        double maxDistance = Math.max(0.0, cellRadius - nucleusRadius - margin);
        if (maxDistance <= EPSILON) {
            return candidates;
        }
        double[] rings = {0.14, 0.28};
        for (int ring = 0; ring < rings.length; ring++) {
            double distance = maxDistance * rings[ring];
            int points = 5 + ring * 3;
            for (int i = 0; i < points; i++) {
                double angle = Math.PI * 2.0 * i / points + hash01(id + 2713, ring * 31 + i) * 0.18;
                candidates.add(new LayoutCircle(Math.cos(angle) * distance, Math.sin(angle) * distance, nucleusRadius, 0.0));
            }
        }
        return candidates;
    }

    private InternalLayout placeLysosomesForNucleus(LayoutCircle nucleus, double[] lysosomeRadii, double cellRadius, double margin) {
        int count = lysosomeRadii.length;
        LayoutCircle[] positions = new LayoutCircle[count];
        double score = Math.hypot(nucleus.x, nucleus.y) * 22.0;
        final double goldenAngle = Math.PI * (3.0 - Math.sqrt(5.0));

        double nucleusEdgeGap = cellRadius - Math.hypot(nucleus.x, nucleus.y) - nucleus.r - margin;
        if (nucleusEdgeGap < 0.0) {
            score += 100_000.0 + Math.abs(nucleusEdgeGap) * 4_000.0;
            double[] clamped = clampInsideCell(nucleus.x, nucleus.y, nucleus.r, cellRadius, margin);
            nucleus = new LayoutCircle(clamped[0], clamped[1], nucleus.r, 0.0);
        }

        for (int i = 0; i < count; i++) {
            double r = lysosomeRadii[i];
            double baseAngle = hash01(id + 1709, i * 3 + 1) * Math.PI * 2.0;
            double radialHash = hash01(id + 1709, i * 3 + 2);
            double minDistanceFromCenter = Math.min(cellRadius * 0.88, nucleus.r + r + margin);
            double maxDistanceFromCenter = Math.max(0.0, cellRadius - r - margin);
            if (maxDistanceFromCenter < minDistanceFromCenter) {
                minDistanceFromCenter = maxDistanceFromCenter;
            }
            double desiredDistance = minDistanceFromCenter + (maxDistanceFromCenter - minDistanceFromCenter) * (0.22 + 0.70 * radialHash);
            LayoutCircle best = null;
            double bestScore = Double.POSITIVE_INFINITY;

            for (int attempt = 0; attempt < MAX_LYSOSOME_LAYOUT_ATTEMPTS; attempt++) {
                double angle = baseAngle + goldenAngle * attempt;
                double distanceT = hash01(id + 1709, i * 97 + attempt * 7 + 11);
                double distance = attempt == 0
                        ? desiredDistance
                        : minDistanceFromCenter + (maxDistanceFromCenter - minDistanceFromCenter) * distanceT;
                double candidateX = Math.cos(angle) * distance;
                double candidateY = Math.sin(angle) * distance;
                double[] clamped = clampInsideCell(candidateX, candidateY, r, cellRadius, margin);
                candidateX = clamped[0];
                candidateY = clamped[1];

                double candidateScore = Math.abs(Math.hypot(candidateX, candidateY) - desiredDistance) * 0.25
                        + Math.abs(Math.sin((angle - baseAngle) * 0.5)) * cellRadius * 0.05;

                double nucleusGap = Math.hypot(candidateX - nucleus.x, candidateY - nucleus.y) - nucleus.r - r - margin;
                if (nucleusGap < 0.0) {
                    candidateScore += 12_000.0 + Math.abs(nucleusGap) * 1_200.0;
                }

                double edgeGap = cellRadius - Math.hypot(candidateX, candidateY) - r - margin;
                if (edgeGap < 0.0) {
                    candidateScore += 100_000.0 + Math.abs(edgeGap) * 4_000.0;
                }

                for (int j = 0; j < i; j++) {
                    double gap = Math.hypot(candidateX - positions[j].x, candidateY - positions[j].y) - r - positions[j].r - margin;
                    if (gap < 0.0) {
                        candidateScore += 12_000.0 + Math.abs(gap) * 1_200.0;
                    }
                }

                if (candidateScore < bestScore) {
                    bestScore = candidateScore;
                    best = new LayoutCircle(candidateX, candidateY, r, baseAngle * 0.25);
                }
            }

            if (best == null) {
                double[] clamped = clampInsideCell(0.0, 0.0, r, cellRadius, margin);
                best = new LayoutCircle(clamped[0], clamped[1], r, baseAngle * 0.25);
            }
            positions[i] = best;
            score += bestScore;
        }

        return new InternalLayout(nucleus.x, nucleus.y, positions, score);
    }

    private InternalLayout centeredFallback(int count, double[] lysosomeRadii, double cellRadius, double nucleusRadius, double margin) {
        LayoutCircle[] positions = new LayoutCircle[count];
        for (int i = 0; i < count; i++) {
            double angle = hash01(id + 1709, i * 3 + 1) * Math.PI * 2.0;
            double radius = lysosomeRadii[i];
            double distance = Math.max(0.0, cellRadius - radius - margin);
            positions[i] = new LayoutCircle(Math.cos(angle) * distance, Math.sin(angle) * distance, radius, angle * 0.25);
        }
        return new InternalLayout(0.0, 0.0, positions, 0.0);
    }

    private double[] clampInsideCell(double localX, double localY, double radius, double cellRadius, double margin) {
        double maxDistance = Math.max(0.0, cellRadius - radius - margin);
        double distance = Math.hypot(localX, localY);
        if (distance <= maxDistance || distance <= EPSILON) {
            return new double[]{localX, localY};
        }
        return new double[]{localX / distance * maxDistance, localY / distance * maxDistance};
    }

    private double desiredLysosomeLayoutRadius(int index, double cellRadius) {
        double baseRadius = Math.sqrt(Math.max(0.0, config.getCell().getLysosomeAreaFactor()) / Math.PI);
        LysosomeSlot slot = getLysosomeSlot(index);
        if (slot != null && slot.isOccupied()) {
            double foodRadius = Math.max(slot.getFoodRadius(), slot.getTargetFoodRadius());
            if (foodRadius > 0.0) {
                baseRadius = Math.max(baseRadius, foodRadius * LYSOSOME_FOOD_RADIUS_FACTOR);
            }
        }
        return Math.min(baseRadius, Math.max(0.35, cellRadius * LYSOSOME_MAX_RADIUS_FACTOR));
    }

    private double smoothingAlpha(double smoothing, double tickScale) {
        if (tickScale <= 0.0) return 0.0;
        return clamp01(1.0 - Math.exp(-Math.max(0.0, smoothing) * tickScale));
    }

    private static double hash01(long seed, int salt) {
        int x = ((int) Math.floor((double) seed) * 374761393) ^ (salt * 668265263);
        x ^= (x >>> 13);
        x *= 1274126177;
        x ^= (x >>> 16);
        return Integer.toUnsignedLong(x) / 4294967296.0;
    }

    private record LayoutCircle(double x, double y, double r, double rotation) {
    }



    public record ScalarDamageChannel(String id, DoubleSupplier getter, DoubleConsumer setter) {
    }

    public record SlotDamageChannel<T>(
            String id,
            List<T> slots,
            IntFunction<T> slotByIndex,
            DoubleSupplier averageDamage,
            ToIntFunction<T> indexGetter,
            ToDoubleFunction<T> damageGetter,
            ObjDoubleConsumer<T> damageSetter
    ) {
    }

    @FunctionalInterface
    public interface ObjDoubleConsumer<T> {
        void accept(T target, double value);
    }


    private record InternalLayout(double nucleusX, double nucleusY, LayoutCircle[] lysosomes, double score) {
    }
}





