package com.hellengi.biolab.domain.physics;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import static com.hellengi.biolab.util.Utils.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MotionForces {
    private final YamlConfig baseConfig;
    private final RuntimeOverrides runtimeConfig;

    public void applyViscosity(Cell cell, double tickScale) {
        double radius = cell.getRadius();
        double mass = cell.getMass();
        double viscosity = runtimeConfig.getViscosity();
        if (viscosity <= 0.0) return;

        double drag = viscosity * radius / avoidZero(mass);
        double damping = Math.exp(-drag * tickScale);

        cell.setVx(cell.getVx() * damping);
        cell.setVy(cell.getVy() * damping);
    }

    public void applyGravity(Cell cell, double tickScale) {
        double mass = cell.getMass();
        double acceleration = calculateGravForce(cell) / avoidZero(mass);
        cell.setVy(cell.getVy() + acceleration * tickScale);
    }

    public double calculateDragForce(double vx, double vy, double radius) {
        double viscosity = runtimeConfig.getViscosity();
        double speed = Math.sqrt(vx * vx + vy * vy);

        return viscosity * radius * speed;
    }

    public double calculateGravForce(Cell cell) {
        double gravity = runtimeConfig.getGravity();
        if (gravity == 0.0) return 0.0;
        double buoyancy = baseConfig.getEnvironment().getBuoyancyStrength();

        double cellDensity = cell.getDensity();
        double mediumDensity = baseConfig.getEnvironment().getMediumDensity();
        double relativeDensity = (cellDensity - mediumDensity) / avoidZero(cellDensity);

        double acceleration = gravity * buoyancy * relativeDensity;

        return cell.getMass() * acceleration;
    }
}