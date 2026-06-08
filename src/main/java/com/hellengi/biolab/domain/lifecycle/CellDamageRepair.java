package com.hellengi.biolab.domain.lifecycle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.LysosomeSlot;
import com.hellengi.biolab.domain.model.FlagellumSlot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

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
        double nucleusShare = Math.max(0.0, c.getCellRepairShare());
        double cpShare = Math.max(0.0, c.getCpRepairShare());
        double lyShare = cell.hasLysosomes() ? Math.max(0.0, c.getLysosomeRepairShare()) : 0.0;
        double flShare = cell.hasFlagella() ? Math.max(0.0, c.getFlagellumRepairShare()) : 0.0;
        double mbShare = Math.max(0.0, c.getMembraneRepairShare());
        double cytosolShare = Math.max(0.0, c.getCellRepairShare());
        double shareSum = Math.max(EPSILON, nucleusShare + cpShare + lyShare + flShare + mbShare + cytosolShare);
        nucleusShare /= shareSum;
        cpShare /= shareSum;
        lyShare /= shareSum;
        flShare /= shareSum;
        mbShare /= shareSum;
        cytosolShare /= shareSum;

        double nucleusRepair = Math.min(
                cell.getNucleusDamage(),
                Math.min(
                        repairCapacity * nucleusShare * tickScale,
                        cell.getEnergy() / Math.max(c.getCellRepairEnergyCost(), EPSILON)
                )
        );
        double nucleusRepairCost = nucleusRepair * c.getCellRepairEnergyCost();
        cell.setNucleusDamage(Math.max(0.0, cell.getNucleusDamage() - nucleusRepair));
        cell.setEnergy(Math.max(0.0, cell.getEnergy() - nucleusRepairCost));

        double cpRepair = Math.min(
                cell.getCpDamage(),
                Math.min(
                        repairCapacity * cpShare * tickScale,
                        cell.getEnergy() / Math.max(c.getCpRepairEnergyCost(), EPSILON)
                )
        );
        double cpRepairCost = cpRepair * c.getCpRepairEnergyCost();
        cell.setCpDamage(Math.max(0.0, cell.getCpDamage() - cpRepair));
        cell.setEnergy(Math.max(0.0, cell.getEnergy() - cpRepairCost));

        double lysosomeRepair = repairLysosomes(cell, repairCapacity * lyShare * tickScale, tickScale);
        double lysosomeRepairCost = lysosomeRepair * c.getLysosomeRepairEnergyCost();
        cell.setEnergy(Math.max(0.0, cell.getEnergy() - lysosomeRepairCost));

        double flagellumRepair = repairFlagella(cell, repairCapacity * flShare * tickScale, tickScale);
        double flagellumRepairCost = flagellumRepair * c.getFlagellumRepairEnergyCost();
        cell.setEnergy(Math.max(0.0, cell.getEnergy() - flagellumRepairCost));

        double membraneRepair = Math.min(
                cell.getMembraneDamage(),
                Math.min(
                        repairCapacity * mbShare * tickScale,
                        cell.getEnergy() / Math.max(c.getMembraneRepairEnergyCost(), EPSILON)
                )
        );
        double membraneRepairCost = membraneRepair * c.getMembraneRepairEnergyCost();
        cell.setMembraneDamage(Math.max(0.0, cell.getMembraneDamage() - membraneRepair));
        cell.setEnergy(Math.max(0.0, cell.getEnergy() - membraneRepairCost));

        double cytosolRepair = Math.min(
                cell.getCellDamage(),
                Math.min(
                        repairCapacity * cytosolShare * tickScale,
                        cell.getEnergy() / Math.max(c.getCellRepairEnergyCost(), EPSILON)
                )
        );
        double cytosolRepairCost = cytosolRepair * c.getCellRepairEnergyCost();
        cell.setCellDamage(Math.max(0.0, cell.getCellDamage() - cytosolRepair));
        cell.setEnergy(Math.max(0.0, cell.getEnergy() - cytosolRepairCost));

        return new RepairResult(
                cpRepair / tickScale,
                nucleusRepair / tickScale,
                nucleusRepairCost / tickScale,
                cytosolRepair / tickScale,
                0.0,
                membraneRepair / tickScale,
                membraneRepairCost / tickScale,
                (nucleusRepairCost + cpRepairCost + lysosomeRepairCost + flagellumRepairCost + membraneRepairCost + cytosolRepairCost) / tickScale,
                lysosomeRepair / tickScale,
                lysosomeRepairCost / tickScale,
                flagellumRepair / tickScale,
                flagellumRepairCost / tickScale
        );
    }

    private double flagellumTotalDamageRate(Cell cell) {
        if (!cell.hasFlagella()) {
            return 0.0;
        }
        return cell.getFlagellumSlots().stream()
                .mapToDouble(FlagellumSlot::getLastDamageRate)
                .sum();
    }

    private double repairFlagella(Cell cell, double repairBudget, double tickScale) {
        YamlConfig.CellProperties c = config.getCell();
        if (!cell.hasFlagella() || repairBudget <= 0.0 || cell.getEnergy() <= 0.0) {
            return 0.0;
        }

        double energyLimitedBudget = Math.min(
                repairBudget,
                cell.getEnergy() / Math.max(c.getFlagellumRepairEnergyCost(), EPSILON)
        );
        double remaining = energyLimitedBudget;
        double repaired = 0.0;

        for (FlagellumSlot slot : cell.getFlagellumSlots()) {
            if (remaining <= EPSILON) break;
            double amount = Math.min(slot.getDamage(), remaining);
            slot.repair(amount);
            slot.rememberRepairRates(amount / Math.max(tickScale, EPSILON), amount * c.getFlagellumRepairEnergyCost() / Math.max(tickScale, EPSILON));
            repaired += amount;
            remaining -= amount;
        }

        return repaired;
    }

    private double repairLysosomes(Cell cell, double repairBudget, double tickScale) {
        YamlConfig.CellProperties c = config.getCell();
        if (!cell.hasLysosomes() || repairBudget <= 0.0 || cell.getEnergy() <= 0.0) {
            return 0.0;
        }

        double energyLimitedBudget = Math.min(
                repairBudget,
                cell.getEnergy() / Math.max(c.getLysosomeRepairEnergyCost(), EPSILON)
        );
        double remaining = energyLimitedBudget;
        double repaired = 0.0;

        for (LysosomeSlot slot : cell.getLysosomeSlots()) {
            if (remaining <= EPSILON) break;
            double amount = Math.min(slot.getDamage(), remaining);
            slot.repair(amount);
            slot.rememberRepairRates(amount / Math.max(tickScale, EPSILON), amount * c.getLysosomeRepairEnergyCost() / Math.max(tickScale, EPSILON));
            repaired += amount;
            remaining -= amount;
        }

        return repaired;
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











