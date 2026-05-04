package com.hellengi.biolab.api.presentation;

import com.hellengi.biolab.config.SimulationProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RenderMapper {
    private final SimulationProperties config;

    public double calculateCellRadius(double energy, double divisionThreshold) {
        double safeThreshold = Math.max(0.1, divisionThreshold);
        double energyNorm = Math.max(0.0, Math.min(1.0, energy / safeThreshold));
        return config.getRender().getCellBaseRadius()
                + energyNorm * config.getRender().getCellRadiusScale();
    }

    public double calculateFoodRadius(double energy) {
        double minEnergy = Math.max(0.1, config.getFood().getEnergyMin());
        return config.getRender().getFoodBaseRadius() * Math.sqrt(Math.max(0.0, energy / minEnergy));
    }

    public double calculateDeadCellRadius(double energy) {
        double denominator = Math.max(0.1, config.getFood().getEnergyRange());
        double energyNorm = Math.min(1.0, energy / denominator);
        return config.getRender().getCellBaseRadius()
                + energyNorm * config.getRender().getCellRadiusScale();
    }
}