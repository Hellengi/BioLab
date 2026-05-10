package com.hellengi.biolab.simulation.physics;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.Cell;
import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Particle;
import com.hellengi.biolab.simulation.settings.RuntimeOverrides;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CellPhysics {
    private final YamlConfig config;
    private final RuntimeOverrides runtimeConfig;
    private final CellMetrics cellMetrics;
    private final CellCollision cellCollision;

    private static final double MIN_DIRECTION_SPEED = 0.000001;

    public void move(Cell cell, double radius, double stepScale) {
        cell.move(stepScale);
        cellCollision.keepInside(cell, radius);
        updateDirectionFromVelocity(cell);
    }

    public void move(Particle particle, double radius, double stepScale) {
        particle.move(stepScale);
        cellCollision.keepInside(particle, radius);
    }

    public void applyViscosity(Cell cell, double radius, double tickScale) {
        applyViscosity(cell, radius, cellMetrics.currentMass(cell), tickScale);
    }

    public void applyViscosity(DeadCell deadCell, double radius, double tickScale) {
        applyViscosity(deadCell, radius, deadCell.getMass(), tickScale);
    }

    private void applyViscosity(Particle particle, double radius, double mass, double tickScale) {
        double viscosity = runtimeConfig.getViscosity();
        if (viscosity <= 0.0) return;

        double safeRadius = Math.max(radius, 0.000001);
        double safeMass = Math.max(mass, 0.000001);

        double drag = viscosity * safeRadius / safeMass;
        double damping = Math.exp(-drag * tickScale);

        particle.setVx(particle.getVx() * damping);
        particle.setVy(particle.getVy() * damping);
    }

    public void applyGravity(Particle particle, double tickScale) {
        double gravity = runtimeConfig.getGravity();
        if (gravity == 0.0) return;

        particle.setVy(particle.getVy() + gravity * tickScale);
    }

    public void applyGravity(Cell cell, double radius, double tickScale) {
        double mass = Math.max(0.000001, cellMetrics.currentMass(cell));
        double acceleration = calculateGravityBuoyancyForce(cell, radius) / mass;
        cell.setVy(cell.getVy() + acceleration * tickScale);
    }

    public double calculateDragForce(Particle particle, double radius, double mass) {
        double viscosity = runtimeConfig.getViscosity();
        double speed = Math.sqrt(particle.getVx() * particle.getVx() + particle.getVy() * particle.getVy());

        return viscosity * radius * speed;
    }

    public double calculateGravityBuoyancyForce(Cell cell, double radius) {
        double gravity = runtimeConfig.getGravity();
        if (gravity == 0.0) return 0.0;

        double cellDensity = cellMetrics.density(cell, radius);
        double mediumDensity = Math.max(0.000001, config.getEnvironment().getMediumDensity());
        double relativeDensity = (cellDensity - mediumDensity) / Math.max(0.000001, cellDensity);

        double acceleration = gravity
                * config.getEnvironment().getBuoyancyStrength()
                * relativeDensity;

        return cellMetrics.currentMass(cell) * acceleration;
    }

    private void updateDirectionFromVelocity(Cell cell) {
        double speedSquared = cell.getVx() * cell.getVx() + cell.getVy() * cell.getVy();

        if (speedSquared <= MIN_DIRECTION_SPEED * MIN_DIRECTION_SPEED) {
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

        if (distance <= allowedDistance || distance < 0.000001) {
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