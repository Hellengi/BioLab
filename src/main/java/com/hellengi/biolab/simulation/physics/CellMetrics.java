package com.hellengi.biolab.simulation.physics;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.Cell;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CellMetrics {
    private static final double MIN_AREA = 0.000001;

    private final YamlConfig config;

    public double currentMass(Cell cell) {
        return cell.getGenome().getDryMass()
                + cell.getEnergy() * config.getCell().getEnergyToMassFactor();
    }

    public double density(Cell cell, double radius) {
        return density(currentMass(cell), radius);
    }

    public double density(double mass, double radius) {
        double area = Math.PI * radius * radius;
        return mass / Math.max(MIN_AREA, area);
    }

    public double radius(double energy, double divisionThreshold) {
        double safeThreshold = Math.max(0.1, divisionThreshold);
        double energyNorm = Math.max(0.0, Math.min(1.0, energy / safeThreshold));
        return config.getCell().getBaseRadius()
                + energyNorm * config.getCell().getEnergyToRadiusFactor();
    }

    public double deadCellRadius(double energy) {
        double denominator = Math.max(0.1, config.getFood().getMaxEnergy() - config.getFood().getMinEnergy());
        double energyNorm = Math.min(1.0, energy / denominator);
        return config.getCell().getBaseRadius()
                + energyNorm * config.getCell().getEnergyToRadiusFactor();
    }
}