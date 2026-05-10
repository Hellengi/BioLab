package com.hellengi.biolab.simulation.physics;

import com.hellengi.biolab.config.YamlConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FoodMetrics {
    private final YamlConfig config;

    public double radius(double energy) {
        double minEnergy = Math.max(0.1, config.getFood().getMinEnergy());
        return config.getFood().getBaseRadius() * Math.sqrt(Math.max(0.0, energy / minEnergy));
    }
}