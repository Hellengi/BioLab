package com.hellengi.biolab.domain.lifecycle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.LysosomeSlot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import static com.hellengi.biolab.util.Utils.EPSILON;

@Component
@RequiredArgsConstructor
public class CellDamageRepair {
    private final YamlConfig config;

    public void process(Cell cell, double irradiance, double tickScale) {
        if (!cell.isAlive() || cell.getGenome() == null) {
            return;
        }

        double production = cell.calculateEnergyProduction(irradiance);
        double baseConsumption = cell.calculateEnergyConsumption();
        rememberLysosomeBasalConsumption(cell);
        double cpDamageRate = cell.calculateCpPhotoDamageRate(irradiance);
        double cellDamageRate = cell.calculateCellDamageRate(irradiance);

        cell.setEnergy(Math.min(
                cell.getEnergy() + production * tickScale - baseConsumption * tickScale,
                cell.getGenome().getMaxEnergy()
        ));

        cell.setCpDamage(cell.getCpDamage() + cpDamageRate * tickScale);
        cell.setCellDamage(cell.getCellDamage() + cellDamageRate * tickScale);

        RepairResult repair = repair(cell, tickScale);
        cell.rememberMetabolism(
                production,
                baseConsumption + repair.energyCostRate(),
                cpDamageRate,
                cellDamageRate,
                repair.cpRepairRate(),
                repair.cellRepairRate(),
                repair.energyCostRate()
        );
        cell.rememberLysosomeRepair(repair.lysosomeRepairRate(), repair.lysosomeEnergyCostRate());
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
        double cpShare = Math.max(0.0, c.getCpRepairShare());
        double lyShare = cell.hasLysosomes() ? Math.max(0.0, c.getLysosomeRepairShare()) : 0.0;
        double cellShare = Math.max(0.0, c.getCellRepairShare());
        double shareSum = Math.max(EPSILON, cpShare + lyShare + cellShare);
        cpShare /= shareSum;
        lyShare /= shareSum;
        cellShare /= shareSum;

        double cpRepair = Math.min(
                cell.getCpDamage(),
                Math.min(
                        repairCapacity * cpShare * tickScale,
                        cell.getEnergy() / Math.max(c.getCpRepairEnergyCost(), EPSILON)
                )
        );
        double cpRepairCost = cpRepair * c.getCpRepairEnergyCost();
        cell.setCpDamage(Math.max(0.0, cell.getCpDamage() - cpRepair));
        cell.setEnergy(cell.getEnergy() - cpRepairCost);

        double lysosomeRepair = repairLysosomes(cell, repairCapacity * lyShare * tickScale, tickScale);
        double lysosomeRepairCost = lysosomeRepair * c.getLysosomeRepairEnergyCost();
        cell.setEnergy(Math.max(0.0, cell.getEnergy() - lysosomeRepairCost));

        double cellRepair = Math.min(
                cell.getCellDamage(),
                Math.min(
                        repairCapacity * cellShare * tickScale,
                        cell.getEnergy() / Math.max(c.getCellRepairEnergyCost(), EPSILON)
                )
        );
        double cellRepairCost = cellRepair * c.getCellRepairEnergyCost();
        cell.setCellDamage(Math.max(0.0, cell.getCellDamage() - cellRepair));
        cell.setEnergy(cell.getEnergy() - cellRepairCost);

        return new RepairResult(
                cpRepair / tickScale,
                cellRepair / tickScale,
                (cpRepairCost + lysosomeRepairCost + cellRepairCost) / tickScale,
                lysosomeRepair / tickScale,
                lysosomeRepairCost / tickScale
        );
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
            double cellRepairRate,
            double energyCostRate,
            double lysosomeRepairRate,
            double lysosomeEnergyCostRate
    ) {
        static RepairResult zero() {
            return new RepairResult(0.0, 0.0, 0.0, 0.0, 0.0);
        }
    }
}
