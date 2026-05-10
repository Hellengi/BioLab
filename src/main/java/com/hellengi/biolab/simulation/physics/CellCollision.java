package com.hellengi.biolab.simulation.physics;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.Cell;
import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Particle;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class CellCollision {
    private static final double MIN_DISTANCE = 0.0001;
    private static final double MIN_MASS = 0.0001;
    private static final double WALL_ELASTICITY = 1.0;

    private final YamlConfig config;
    private final FoodMetrics foodMetrics;
    private final CellMetrics cellMetrics;

    public void resolveAll(List<Cell> cells, List<DeadCell> deadCells) {
        resolveLiveCells(cells);
        resolveDeadCells(deadCells);
        resolveCrossCollision(cells, deadCells);
    }

    private void resolveLiveCells(List<Cell> cells) {
        for (int i = 0; i < cells.size(); i++) {
            Cell first = cells.get(i);
            if (first.isMarkedForRemoval()) continue;

            for (int j = i + 1; j < cells.size(); j++) {
                Cell second = cells.get(j);
                if (second.isMarkedForRemoval()) continue;

                resolvePair(first, cellRadius(first), second, cellRadius(second));
            }
        }
    }

    private void resolveDeadCells(List<DeadCell> deadCells) {
        for (int i = 0; i < deadCells.size(); i++) {
            DeadCell first = deadCells.get(i);

            for (int j = i + 1; j < deadCells.size(); j++) {
                DeadCell second = deadCells.get(j);
                resolvePair(first, deadCellRadius(first), second, deadCellRadius(second));
            }
        }
    }

    private void resolveCrossCollision(List<Cell> cells, List<DeadCell> deadCells) {
        for (Cell cell : cells) {
            if (cell.isMarkedForRemoval()) continue;
            double cr = cellRadius(cell);

            for (DeadCell deadCell : deadCells) {
                resolvePair(cell, cr, deadCell, deadCellRadius(deadCell));
            }
        }
    }

    private void resolvePair(Particle first, double firstRadius, Particle second, double secondRadius) {
        double dx = second.getX() - first.getX();
        double dy = second.getY() - first.getY();
        double minDistance = firstRadius + secondRadius;
        double distanceSquared = dx * dx + dy * dy;

        if (distanceSquared >= minDistance * minDistance) return;

        double distance = Math.sqrt(Math.max(distanceSquared, MIN_DISTANCE));
        double normalX = dx / distance;
        double normalY = dy / distance;

        separate(first, second, normalX, normalY, minDistance - distance);
        reflect(first, second, normalX, normalY);
    }

    private void separate(Particle first, Particle second,
                          double normalX, double normalY, double overlap) {
        double slop = Math.max(0.0, config.getCollision().getPositionSlop());
        double correctionPercent = clampUnit(config.getCollision().getCorrectionPercent());

        double correctedOverlap = Math.max(overlap - slop, 0.0) * correctionPercent;
        if (correctedOverlap <= 0.0) return;

        double firstMass = particleMass(first);
        double secondMass = particleMass(second);
        double totalMass = firstMass + secondMass;

        double firstShare = secondMass / totalMass;
        double secondShare = firstMass / totalMass;

        first.setX(first.getX() - normalX * correctedOverlap * firstShare);
        first.setY(first.getY() - normalY * correctedOverlap * firstShare);

        second.setX(second.getX() + normalX * correctedOverlap * secondShare);
        second.setY(second.getY() + normalY * correctedOverlap * secondShare);
    }

    private void reflect(Particle first, Particle second, double normalX, double normalY) {
        double relativeVx = second.getVx() - first.getVx();
        double relativeVy = second.getVy() - first.getVy();
        double velocityAlongNormal = relativeVx * normalX + relativeVy * normalY;

        if (velocityAlongNormal > 0.0) return;

        double restitution = pairRestitution(first, second);
        double firstMass = particleMass(first);
        double secondMass = particleMass(second);

        double impulse = -(1.0 + restitution) * velocityAlongNormal;
        impulse /= 1.0 / firstMass + 1.0 / secondMass;

        double impulseX = impulse * normalX;
        double impulseY = impulse * normalY;

        first.setVx(first.getVx() - impulseX / firstMass);
        first.setVy(first.getVy() - impulseY / firstMass);

        second.setVx(second.getVx() + impulseX / secondMass);
        second.setVy(second.getVy() + impulseY / secondMass);

        first.recordCollisionImpulse(impulse, -normalX, -normalY);
        second.recordCollisionImpulse(impulse, normalX, normalY);
    }

    public void keepInside(Particle particle, double radius) {
        keepInside(particle, radius, true);
    }

    public void keepInside(Particle particle, double radius, boolean reflect) {
        double centerX = config.worldCenterX();
        double centerY = config.worldCenterY();
        double allowedDistance = Math.max(0.0, config.worldRadius() - radius);

        double dx = particle.getX() - centerX;
        double dy = particle.getY() - centerY;
        double distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.000001) {
            return;
        }

        double nx = dx / distance;
        double ny = dy / distance;

        boolean outside = distance > allowedDistance;

        if (outside) {
            particle.setX(centerX + nx * allowedDistance);
            particle.setY(centerY + ny * allowedDistance);
        }

        if (!reflect || !outside) {
            return;
        }

        resolveWallCollision(particle, nx, ny);
    }

    private void resolveWallCollision(
            Particle particle,
            double nx,
            double ny
    ) {
        double vx = particle.getVx();
        double vy = particle.getVy();

        double velocityAlongNormal = vx * nx + vy * ny;

        if (velocityAlongNormal <= 0.0) {
            return;
        }

        double restitution = wallRestitution(particle);

        double mass = Math.max(0.0001, particleMass(particle));

        double impulse = -(1.0 + restitution)
                * velocityAlongNormal * mass;

        double impulseX = impulse * nx;
        double impulseY = impulse * ny;

        particle.setVx(vx + impulseX / mass);
        particle.setVy(vy + impulseY / mass);

        particle.recordCollisionImpulse(Math.abs(impulse), -nx, -ny);
    }

    private double cellRadius(Cell cell) {
        return cellMetrics.radius(
                cell.getEnergy(), cell.getGenome().getDivisionThreshold());
    }

    private double deadCellRadius(DeadCell deadCell) {
        return cellMetrics.deadCellRadius(deadCell.getEnergy());
    }

    private double particleMass(Particle particle) {
        if (particle instanceof Cell cell) {
            return Math.max(MIN_MASS, cellMetrics.currentMass(cell));
        }

        if (particle instanceof DeadCell deadCell) {
            return Math.max(MIN_MASS, deadCell.getMass());
        }

        return MIN_MASS;
    }

    private double pairRestitution(Particle first, Particle second) {
        double globalCap = clampUnit(config.getCollision().getCellRestitution());
        return globalCap * Math.sqrt(elasticity(first) * elasticity(second));
    }

    private double wallRestitution(Particle particle) {
        double globalCap = clampUnit(config.getCollision().getCellRestitution());
        return globalCap * Math.sqrt(elasticity(particle) * WALL_ELASTICITY);
    }

    private double elasticity(Particle particle) {
        if (particle instanceof Cell cell) {
            return clampUnit(cell.getGenome().getElasticity());
        }

        if (particle instanceof DeadCell) {
            return clampUnit(config.getCollision().getDeadCellRestitution());
        }

        return 0.0;
    }

    private double clampUnit(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }
}