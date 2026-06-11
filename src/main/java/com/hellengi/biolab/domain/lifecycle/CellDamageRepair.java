package com.hellengi.biolab.domain.lifecycle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.LysosomeSlot;
import com.hellengi.biolab.domain.model.FlagellumSlot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.BiConsumer;
import java.util.function.DoubleConsumer;
import java.util.function.DoubleSupplier;
import java.util.function.ToDoubleFunction;

import static com.hellengi.biolab.util.Utils.EPSILON;
import static com.hellengi.biolab.util.Utils.clamp01;

@Component
@RequiredArgsConstructor
public class CellDamageRepair {
    private static final double LOW_ENERGY_SUPPLY_CURVE = 2.0;
    private static final double ENERGY_DEFICIT_DAMAGE_CURVE = 1.7;
    private static final double MAX_CYTOSOL_ENERGY_DEFICIT_DAMAGE_RATE = 0.0045;

    private final YamlConfig config;

    public void process(Cell cell, double irradiance, double tickScale) {
        if (!cell.isAlive() || cell.getGenome() == null) {
            return;
        }

        double photosynthesisProduction = cell.calculateEnergyProduction(irradiance);
        double digestionProduction = Math.max(0.0, cell.getLastDigestionEnergyProduction());
        double energyInflow = photosynthesisProduction + digestionProduction;
        double baseConsumption = cell.calculateEnergyConsumption();
        rememberLysosomeBasalConsumption(cell);
        double energyAvailability = calculateEnergyAvailability(cell, energyInflow, baseConsumption);
        double actualBasalSupply = baseConsumption * energyAvailability;
        double cpDamageRate = cell.calculateCpPhotoDamageRate(irradiance);
        double nucleusDamageRate = calculateNucleusDamageRate(cell, irradiance);
        double cytosolDamageRate = cell.calculateCellDamageRate(irradiance)
                + calculateCytosolEnergyDeficitDamageRate(energyAvailability);

        cell.setEnergy(Math.min(
                Math.max(0.0, cell.getEnergy() + photosynthesisProduction * tickScale - actualBasalSupply * tickScale),
                cell.getMaxEnergy()
        ));

        cell.setCpDamage(cell.getCpDamage() + cpDamageRate * tickScale);
        cell.setNucleusDamage(cell.getNucleusDamage() + nucleusDamageRate * tickScale);
        cell.setCellDamage(cell.getCellDamage() + cytosolDamageRate * tickScale);

        RepairResult repair = repair(cell, tickScale);
        cell.rememberMetabolism(
                photosynthesisProduction,
                actualBasalSupply + repair.energyCostRate(),
                energyAvailability,
                baseConsumption,
                cpDamageRate,
                nucleusDamageRate,
                cytosolDamageRate,
                repair.nucleusRepairRate(),
                repair.nucleusEnergyCostRate(),
                repair.cpRepairRate(),
                repair.cytosolRepairRate(),
                repair.membraneDamageRate(),
                repair.membraneRepairRate(),
                repair.membraneEnergyCostRate(),
                repair.energyCostRate()
        );
        cell.rememberLysosomeRepair(repair.lysosomeRepairRate(), repair.lysosomeEnergyCostRate());
        cell.rememberFlagellumRepair(flagellumTotalDamageRate(cell), repair.flagellumRepairRate(), repair.flagellumEnergyCostRate());
    }

    private double calculateEnergyAvailability(Cell cell, double energyInflow, double baseConsumption) {
        if (baseConsumption <= EPSILON) {
            return 1.0;
        }

        double incomingEnergy = Math.max(0.0, energyInflow);
        if (incomingEnergy >= baseConsumption) {
            return 1.0;
        }

        double thresholdPercent = Math.max(0.0, config.getCell().getLowEnergyThreshold());
        double thresholdEnergy = Math.max(EPSILON, cell.getMaxEnergy() * clamp01(thresholdPercent / 100.0));
        double reserve01 = clamp01(cell.getEnergy() / thresholdEnergy);
        double reserveSupport = exponentialLowEnergySupply(reserve01) * (baseConsumption - incomingEnergy);
        double actualSupply = Math.min(baseConsumption, incomingEnergy + reserveSupport);
        return clamp01(actualSupply / baseConsumption);
    }

    private double exponentialLowEnergySupply(double reserve01) {
        double x = clamp01(reserve01);
        if (x <= EPSILON) return 0.0;
        if (x >= 1.0 - EPSILON) return 1.0;
        return Math.expm1(LOW_ENERGY_SUPPLY_CURVE * x) / Math.expm1(LOW_ENERGY_SUPPLY_CURVE);
    }


    private double calculateCytosolEnergyDeficitDamageRate(double energyAvailability) {
        double deficit = 1.0 - clamp01(energyAvailability);
        if (deficit <= EPSILON) {
            return 0.0;
        }
        return MAX_CYTOSOL_ENERGY_DEFICIT_DAMAGE_RATE * Math.pow(deficit, ENERGY_DEFICIT_DAMAGE_CURVE);
    }

    private double calculateNucleusDamageRate(Cell cell, double irradiance) {
        YamlConfig.CellProperties c = config.getCell();
        double directPhotoDamage = Math.max(0.0, irradiance)
                * c.getCellPhotoDamageFactor()
                * 0.25
                * (1.0 - cell.getMelaninProtection());
        return directPhotoDamage;
    }

    private void rememberLysosomeBasalConsumption(Cell cell) {
        if (!cell.hasLysosomes()) {
            return;
        }
        YamlConfig.CellProperties c = config.getCell();
        double enzyme = cell.getLysosomeEnzymeActivity01();
        double perSlotBaseCostRate = Math.max(0.0, c.getLysosomeEnergyConsumptionFactor())
                * (0.84 + 0.16 * enzyme);
        for (LysosomeSlot slot : cell.getLysosomeSlots()) {
            slot.addEnergyCostRate(perSlotBaseCostRate);
        }
    }

    private RepairResult repair(Cell cell, double tickScale) {
        double repairCapacity = cell.getRepairCapacity();
        if (repairCapacity <= 0.0 || cell.getEnergy() <= 0.0 || tickScale <= 0.0) {
            return RepairResult.zero();
        }

        YamlConfig.CellProperties c = config.getCell();
        RepairShares shares = repairShares(cell, c);

        RepairStep nucleus = repairScalarDamage(
                cell,
                cell::getNucleusDamage,
                cell::setNucleusDamage,
                repairCapacity * shares.nucleus() * tickScale,
                c.getCellRepairEnergyCost()
        );
        RepairStep cp = repairScalarDamage(
                cell,
                cell::getCpDamage,
                cell::setCpDamage,
                repairCapacity * shares.chloroplasts() * tickScale,
                c.getCpRepairEnergyCost()
        );
        RepairStep lysosomes = repairLysosomes(cell, repairCapacity * shares.lysosomes() * tickScale, tickScale);
        RepairStep flagella = repairFlagella(cell, repairCapacity * shares.flagella() * tickScale, tickScale);
        RepairStep membrane = repairScalarDamage(
                cell,
                cell::getMembraneDamage,
                cell::setMembraneDamage,
                repairCapacity * shares.membrane() * tickScale,
                c.getMembraneRepairEnergyCost()
        );
        RepairStep cytosol = repairScalarDamage(
                cell,
                cell::getCellDamage,
                cell::setCellDamage,
                repairCapacity * shares.cytosol() * tickScale,
                c.getCellRepairEnergyCost()
        );

        return new RepairResult(
                cp.rate(tickScale),
                nucleus.rate(tickScale),
                nucleus.costRate(tickScale),
                cytosol.rate(tickScale),
                0.0,
                membrane.rate(tickScale),
                membrane.costRate(tickScale),
                RepairStep.totalCostRate(tickScale, nucleus, cp, lysosomes, flagella, membrane, cytosol),
                lysosomes.rate(tickScale),
                lysosomes.costRate(tickScale),
                flagella.rate(tickScale),
                flagella.costRate(tickScale)
        );
    }

    private RepairShares repairShares(Cell cell, YamlConfig.CellProperties c) {
        double nucleus = Math.max(0.0, c.getCellRepairShare());
        double chloroplasts = Math.max(0.0, c.getCpRepairShare());
        double lysosomes = cell.hasLysosomes() ? Math.max(0.0, c.getLysosomeRepairShare()) : 0.0;
        double flagella = cell.hasFlagella() ? Math.max(0.0, c.getFlagellumRepairShare()) : 0.0;
        double membrane = Math.max(0.0, c.getMembraneRepairShare());
        double cytosol = Math.max(0.0, c.getCellRepairShare());
        double sum = Math.max(EPSILON, nucleus + chloroplasts + lysosomes + flagella + membrane + cytosol);
        return new RepairShares(
                nucleus / sum,
                chloroplasts / sum,
                lysosomes / sum,
                flagella / sum,
                membrane / sum,
                cytosol / sum
        );
    }

    private RepairStep repairScalarDamage(
            Cell cell,
            DoubleSupplier damageGetter,
            DoubleConsumer damageSetter,
            double repairBudget,
            double energyCostPerDamage
    ) {
        if (repairBudget <= 0.0 || cell.getEnergy() <= 0.0) {
            return RepairStep.zero();
        }

        double unitCost = Math.max(energyCostPerDamage, EPSILON);
        double amount = Math.min(
                Math.max(0.0, damageGetter.getAsDouble()),
                Math.min(repairBudget, cell.getEnergy() / unitCost)
        );
        if (amount <= 0.0) {
            return RepairStep.zero();
        }

        double cost = amount * unitCost;
        damageSetter.accept(Math.max(0.0, damageGetter.getAsDouble() - amount));
        cell.setEnergy(Math.max(0.0, cell.getEnergy() - cost));
        return new RepairStep(amount, cost);
    }

    private double flagellumTotalDamageRate(Cell cell) {
        if (!cell.hasFlagella()) {
            return 0.0;
        }
        return cell.getFlagellumSlots().stream()
                .mapToDouble(FlagellumSlot::getLastDamageRate)
                .sum();
    }

    private RepairStep repairFlagella(Cell cell, double repairBudget, double tickScale) {
        YamlConfig.CellProperties c = config.getCell();
        if (!cell.hasFlagella()) {
            return RepairStep.zero();
        }
        return repairSlotDamage(
                cell,
                cell.getFlagellumSlots(),
                repairBudget,
                c.getFlagellumRepairEnergyCost(),
                tickScale,
                FlagellumSlot::getDamage,
                FlagellumSlot::repair,
                (slot, step) -> slot.rememberRepairRates(step.rate(tickScale), step.costRate(tickScale))
        );
    }

    private RepairStep repairLysosomes(Cell cell, double repairBudget, double tickScale) {
        YamlConfig.CellProperties c = config.getCell();
        if (!cell.hasLysosomes()) {
            return RepairStep.zero();
        }
        return repairSlotDamage(
                cell,
                cell.getLysosomeSlots(),
                repairBudget,
                c.getLysosomeRepairEnergyCost(),
                tickScale,
                LysosomeSlot::getDamage,
                LysosomeSlot::repair,
                (slot, step) -> slot.rememberRepairRates(step.rate(tickScale), step.costRate(tickScale))
        );
    }

    private <T> RepairStep repairSlotDamage(
            Cell cell,
            List<T> slots,
            double repairBudget,
            double energyCostPerDamage,
            double tickScale,
            ToDoubleFunction<T> damageGetter,
            ObjDoubleConsumer<T> repairAction,
            BiConsumer<T, RepairStep> repairObserver
    ) {
        if (slots.isEmpty() || repairBudget <= 0.0 || cell.getEnergy() <= 0.0) {
            return RepairStep.zero();
        }

        double unitCost = Math.max(energyCostPerDamage, EPSILON);
        double remaining = Math.min(repairBudget, cell.getEnergy() / unitCost);
        double repaired = 0.0;

        for (T slot : slots) {
            if (remaining <= EPSILON) break;
            double amount = Math.min(Math.max(0.0, damageGetter.applyAsDouble(slot)), remaining);
            if (amount <= 0.0) continue;

            RepairStep step = new RepairStep(amount, amount * unitCost);
            repairAction.accept(slot, amount);
            repairObserver.accept(slot, step);
            repaired += amount;
            remaining -= amount;
        }

        double cost = repaired * unitCost;
        cell.setEnergy(Math.max(0.0, cell.getEnergy() - cost));
        return new RepairStep(repaired, cost);
    }

    @FunctionalInterface
    private interface ObjDoubleConsumer<T> {
        void accept(T target, double value);
    }

    private record RepairShares(
            double nucleus,
            double chloroplasts,
            double lysosomes,
            double flagella,
            double membrane,
            double cytosol
    ) {
    }

    private record RepairStep(double amount, double cost) {
        static RepairStep zero() {
            return new RepairStep(0.0, 0.0);
        }

        double rate(double tickScale) {
            return amount / Math.max(tickScale, EPSILON);
        }

        double costRate(double tickScale) {
            return cost / Math.max(tickScale, EPSILON);
        }

        static double totalCostRate(double tickScale, RepairStep... steps) {
            double total = 0.0;
            for (RepairStep step : steps) {
                total += step.cost;
            }
            return total / Math.max(tickScale, EPSILON);
        }
    }

    private record RepairResult(
            double cpRepairRate,
            double nucleusRepairRate,
            double nucleusEnergyCostRate,
            double cytosolRepairRate,
            double membraneDamageRate,
            double membraneRepairRate,
            double membraneEnergyCostRate,
            double energyCostRate,
            double lysosomeRepairRate,
            double lysosomeEnergyCostRate,
            double flagellumRepairRate,
            double flagellumEnergyCostRate
    ) {
        static RepairResult zero() {
            return new RepairResult(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        }
    }
}
