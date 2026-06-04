package com.hellengi.biolab.domain.physics;

import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Cell;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class Motion {
    private final MotionCollision motionCollision;
    private final MotionForces motionForces;

    public void process(SimulationWorld world, double tickScale) {
        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) continue;
            motionForces.applyViscosity(cell, tickScale);
            motionForces.applyGravity(cell, tickScale);
        }

        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) continue;
            cell.move(tickScale);
        }

        motionCollision.resolveAll(world.getCells());

        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) continue;
            motionCollision.keepInsideWorld(cell, cell.getRadius());
        }
    }
}
