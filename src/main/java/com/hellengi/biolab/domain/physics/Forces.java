package com.hellengi.biolab.domain.physics;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import static com.hellengi.biolab.util.Utils.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class Forces {
    private final YamlConfig config;
    private final RuntimeOverrides runtimeConfig;
    private final Collision collision;

    public void move(Cell cell, double radius, double stepScale) {
        cell.move(stepScale);
        collision.keepInside(cell, radius);
    }

    public void apply(Cell cell, double tickScale) {
        applyViscosity(cell, tickScale);
        applyGravity(cell, tickScale);
    }

    private void applyViscosity(Cell cell, double tickScale) {
        double radius = cell.getRadius();
        double mass = cell.getMass();
        double viscosity = runtimeConfig.getViscosity();
        if (viscosity <= 0.0) return;

        double drag = viscosity * radius / avoidZero(mass);
        double damping = Math.exp(-drag * tickScale);

        cell.setVx(cell.getVx() * damping);
        cell.setVy(cell.getVy() * damping);
    }

    private void applyGravity(Cell cell, double tickScale) {
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
        double buoyancy = config.getEnvironment().getBuoyancyStrength();

        double cellDensity = cell.getDensity();
        double mediumDensity = config.getEnvironment().getMediumDensity();
        double relativeDensity = (cellDensity - mediumDensity) / avoidZero(cellDensity);

        double acceleration = gravity * buoyancy * relativeDensity;

        return cell.getMass() * acceleration;
    }

    public void updateDirectionFromVelocity(Cell cell) {
        double speedSquared = cell.getVx() * cell.getVx() + cell.getVy() * cell.getVy();

        if (speedSquared <= EPSILON * EPSILON) {
            return;
        }

        cell.setDirectionAngle(normalizeDegrees(
                Math.toDegrees(Math.atan2(cell.getVy(), cell.getVx())) + 90.0
        ));
    }

    private double normalizeDegrees(double angle) {
        double normalized = angle % 360.0;
        return normalized < 0.0 ? normalized + 360.0 : normalized;
    }

    public double clampX(double x) {
        return Math.max(0.0, Math.min(config.getTubeDiameter(), x));
    }

    public double clampY(double y) {
        return Math.max(0.0, Math.min(config.getTubeDiameter(), y));
    }

    public double clampInsideCircleX(double x, double y, double radius) {
        return clampedPoint(x, y, radius).x();
    }

    public double clampInsideCircleY(double x, double y, double radius) {
        return clampedPoint(x, y, radius).y();
    }

    private Point clampedPoint(double x, double y, double radius) {
        double centerX = config.worldCenterX();
        double centerY = config.worldCenterY();
        double allowedDistance = Math.max(0.0, config.worldRadius() - radius);

        double dx = x - centerX;
        double dy = y - centerY;
        double distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= allowedDistance || distance < EPSILON) {
            return new Point(x, y);
        }

        double nx = dx / distance;
        double ny = dy / distance;

        return new Point(
                centerX + nx * allowedDistance,
                centerY + ny * allowedDistance
        );
    }

    private record Point(double x, double y) {
    }
}