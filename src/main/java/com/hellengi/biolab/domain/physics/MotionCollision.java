package com.hellengi.biolab.domain.physics;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.ImpulseEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

import static com.hellengi.biolab.util.Utils.*;

@Component
@RequiredArgsConstructor
public class MotionCollision {
    private static final double WALL_ELASTICITY = 1.0;

    private final YamlConfig config;

    public void resolveAll(List<Cell> cells) {
        for (int i = 0; i < cells.size(); i++) {
            Cell first = cells.get(i);

            if (first.isMarkedForRemoval()) continue;

            for (int j = i + 1; j < cells.size(); j++) {
                Cell second = cells.get(j);

                if (second.isMarkedForRemoval()) continue;

                resolvePair(first, first.getRadius(), second, second.getRadius());
            }
        }
    }

    private void resolvePair(Cell first, double firstRadius, Cell second, double secondRadius) {
        double dx = second.getX() - first.getX();
        double dy = second.getY() - first.getY();
        double minDistance = firstRadius + secondRadius;
        double distanceSquared = dx * dx + dy * dy;

        if (distanceSquared >= minDistance * minDistance) return;

        double distance = Math.sqrt(avoidZero(distanceSquared));
        double normalX = dx / distance;
        double normalY = dy / distance;

        separate(first, second, normalX, normalY, minDistance - distance);
        reflect(first, second, normalX, normalY);
    }

    private void separate(Cell first, Cell second,
                          double normalX, double normalY, double overlap) {
        double slop = Math.max(0.0, config.getCollision().getPositionSlop());
        double correctionPercent = clampUnit(config.getCollision().getCorrectionPercent());

        double correctedOverlap = Math.max(overlap - slop, 0.0) * correctionPercent;
        if (correctedOverlap <= 0.0) return;

        double firstMass = first.getMass();
        double secondMass = second.getMass();
        double totalMass = firstMass + secondMass;

        double firstShare = secondMass / totalMass;
        double secondShare = firstMass / totalMass;

        first.setX(first.getX() - normalX * correctedOverlap * firstShare);
        first.setY(first.getY() - normalY * correctedOverlap * firstShare);

        second.setX(second.getX() + normalX * correctedOverlap * secondShare);
        second.setY(second.getY() + normalY * correctedOverlap * secondShare);
    }

    private void reflect(Cell first, Cell second, double normalX, double normalY) {
        double relativeVx = second.getVx() - first.getVx();
        double relativeVy = second.getVy() - first.getVy();
        double velocityAlongNormal = relativeVx * normalX + relativeVy * normalY;

        if (velocityAlongNormal > 0.0) return;

        double restitution = pairRestitution(first, second);
        double firstMass = first.getMass();
        double secondMass = second.getMass();

        double impulse = -(1.0 + restitution) * velocityAlongNormal;
        impulse /= 1.0 / firstMass + 1.0 / secondMass;

        double impulseX = impulse * normalX;
        double impulseY = impulse * normalY;

        first.setVx(first.getVx() - impulseX / firstMass);
        first.setVy(first.getVy() - impulseY / firstMass);

        second.setVx(second.getVx() + impulseX / secondMass);
        second.setVy(second.getVy() + impulseY / secondMass);

        first.addEvent(ImpulseEvent.create(impulse, -normalX, -normalY));
        second.addEvent(ImpulseEvent.create(impulse, normalX, normalY));
    }

    public void keepInsideWorld(Cell cell, double radius) {
        double centerX = config.worldCenterX();
        double centerY = config.worldCenterY();
        double allowedDistance = Math.max(0.0, config.worldRadius() - radius);

        double dx = cell.getX() - centerX;
        double dy = cell.getY() - centerY;
        double distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < EPSILON) {
            return;
        }

        double nx = dx / distance;
        double ny = dy / distance;

        boolean outside = distance > allowedDistance;

        if (outside) {
            cell.setX(centerX + nx * allowedDistance);
            cell.setY(centerY + ny * allowedDistance);
        }

        if (!outside) {
            return;
        }

        resolveWallCollision(cell, nx, ny);
    }

    private void resolveWallCollision(
            Cell cell,
            double nx,
            double ny
    ) {
        double vx = cell.getVx();
        double vy = cell.getVy();

        double velocityAlongNormal = vx * nx + vy * ny;

        if (velocityAlongNormal <= 0.0) {
            return;
        }

        double restitution = wallRestitution(cell);

        double mass = cell.getMass();

        double impulse = -(1.0 + restitution)
                * velocityAlongNormal * mass;

        double impulseX = impulse * nx;
        double impulseY = impulse * ny;

        cell.setVx(vx + impulseX / avoidZero(mass));
        cell.setVy(vy + impulseY / avoidZero(mass));

        cell.addEvent(ImpulseEvent.create(Math.abs(impulse), -nx, -ny));
    }

    private double pairRestitution(Cell first, Cell second) {
        double globalCap = clampUnit(config.getCollision().getCellRestitution());
        return globalCap * Math.sqrt(elasticity(first) * elasticity(second));
    }

    private double wallRestitution(Cell cell) {
        double globalCap = clampUnit(config.getCollision().getCellRestitution());
        return globalCap * Math.sqrt(elasticity(cell) * WALL_ELASTICITY);
    }

    private double elasticity(Cell cell) {
        if (!cell.isAlive()) {
            return clampUnit(config.getCollision().getDeadCellRestitution());
        }

        return clampUnit(cell.getGenome().getElasticity());
    }

    private double clampUnit(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }
}