package com.hellengi.biolab.domain.physics;

import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Cell;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class Motion {
    private final MotionCollision motionCollision;
    private final MotionForces motionForces;

    public void process(SimulationWorld world, double tickScale) {
        List<MotionState> motionStates = new ArrayList<>(world.getCells().size());

        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) continue;
            motionStates.add(new MotionState(cell, cell.getVx(), cell.getVy(), cell.getAngularVelocity()));
            motionForces.applyViscosity(cell, tickScale);
            motionForces.applyFlagella(cell, tickScale);
            motionForces.applyGravity(cell, tickScale);
        }

        for (MotionState state : motionStates) {
            Cell cell = state.cell();
            if (cell.isMarkedForRemoval()) continue;
            cell.moveWithVelocityVerlet(
                    tickScale,
                    state.vx(),
                    state.vy(),
                    state.angularVelocity()
            );
        }

        motionCollision.resolveAll(world.getCells());

        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) continue;
            motionCollision.keepInsideWorld(cell, cell.getRadius());
        }
    }

    private record MotionState(Cell cell, double vx, double vy, double angularVelocity) {
    }
}
