package com.hellengi.biolab.domain.physics;

import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Cell;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class Motion {
    private static final int MIN_BUFFER_SIZE = 64;

    private final MotionCollision motionCollision;
    private final MotionForces motionForces;

    private double[] previousVx = new double[MIN_BUFFER_SIZE];
    private double[] previousVy = new double[MIN_BUFFER_SIZE];
    private double[] previousAngularVelocity = new double[MIN_BUFFER_SIZE];

    public void process(SimulationWorld world, double tickScale) {
        List<Cell> cells = world.getCells();
        ensureBufferCapacity(cells.size());

        int index = 0;
        for (Cell cell : cells) {
            if (cell.isMarkedForRemoval()) {
                continue;
            }
            previousVx[index] = cell.getVx();
            previousVy[index] = cell.getVy();
            previousAngularVelocity[index] = cell.getAngularVelocity();
            motionForces.applyViscosity(cell, tickScale);
            motionForces.applyFlagella(cell, tickScale);
            motionForces.applyGravity(cell, tickScale);
            index++;
        }

        index = 0;
        for (Cell cell : cells) {
            if (cell.isMarkedForRemoval()) {
                continue;
            }
            cell.moveWithVelocityVerlet(
                    tickScale,
                    previousVx[index],
                    previousVy[index],
                    previousAngularVelocity[index]
            );
            index++;
        }

        motionCollision.resolveAll(cells);

        for (Cell cell : cells) {
            if (cell.isMarkedForRemoval()) continue;
            motionCollision.keepInsideWorld(cell, cell.getRadius());
        }
    }

    private void ensureBufferCapacity(int requiredSize) {
        if (previousVx.length >= requiredSize) {
            return;
        }
        int newSize = previousVx.length;
        while (newSize < requiredSize) {
            newSize *= 2;
        }
        previousVx = new double[newSize];
        previousVy = new double[newSize];
        previousAngularVelocity = new double[newSize];
    }
}
