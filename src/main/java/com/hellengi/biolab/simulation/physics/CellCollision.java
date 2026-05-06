package com.hellengi.biolab.simulation.physics;

import com.hellengi.biolab.api.presentation.RenderMetrics;
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

    private final YamlConfig config;
    private final RenderMetrics renderMetrics;

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
        double halfOverlap = overlap / 2.0;

        first.setX(first.getX() - normalX * halfOverlap);
        first.setY(first.getY() - normalY * halfOverlap);

        second.setX(second.getX() + normalX * halfOverlap);
        second.setY(second.getY() + normalY * halfOverlap);
    }

    private void reflect(Particle first, Particle second, double normalX, double normalY) {
        double relativeVx = second.getVx() - first.getVx();
        double relativeVy = second.getVy() - first.getVy();
        double velocityAlongNormal = relativeVx * normalX + relativeVy * normalY;

        if (velocityAlongNormal > 0.0) return;

        double restitution = Math.max(0.0, Math.min(1.0, config.getPhysics().getCollisionRestitution()));
        double firstMass  = mass(first);
        double secondMass = mass(second);

        double impulse = -(1.0 + restitution) * velocityAlongNormal;
        impulse /= 1.0 / firstMass + 1.0 / secondMass;

        double impulseX = impulse * normalX;
        double impulseY = impulse * normalY;

        first.setVx(first.getVx()   - impulseX / firstMass);
        first.setVy(first.getVy()   - impulseY / firstMass);

        second.setVx(second.getVx() + impulseX / secondMass);
        second.setVy(second.getVy() + impulseY / secondMass);
    }

    private double cellRadius(Cell cell) {
        return renderMetrics.calculateCellRadius(
                cell.getEnergy(), cell.getGenome().getDivisionThreshold());
    }

    private double deadCellRadius(DeadCell deadCell) {
        return renderMetrics.calculateDeadCellRadius(deadCell.getEnergy());
    }

    private double mass(Particle particle) {
        return Math.max(MIN_MASS, particle.getEnergy());
    }
}