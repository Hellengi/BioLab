package com.hellengi.biolab.domain.physics;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Cell;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class Motion {
    private final YamlConfig baseConfig;
    private final MotionCollision motionCollision;
    private final MotionForces motionForces;

    public void process(SimulationWorld world, double tickScale) {
        int substeps = calculateCollisionSubsteps(world, tickScale);
        double stepScale = tickScale / substeps;

        for (Cell cell : world.getCells()) {
            if (cell.isMarkedForRemoval()) continue;
            motionForces.applyViscosity(cell, tickScale);
            motionForces.applyGravity(cell, tickScale);
        }
        for (int i = 0; i < substeps; i++) {
            for (Cell cell : world.getCells()) {
                if (cell.isMarkedForRemoval()) continue;
                cell.move(stepScale);
            }
            motionCollision.resolveAll(world.getCells());
            for (Cell cell : world.getCells()) {
                if (cell.isMarkedForRemoval()) continue;
                motionCollision.keepInsideWorld(cell, cell.getRadius());
            }
        }
    }

    private int calculateCollisionSubsteps(SimulationWorld world, double tickScale) {
        double maxSpeed = 0.0;
        for (Cell cell : world.getCells()) {
            if (!cell.isMarkedForRemoval()) {
                maxSpeed = Math.max(maxSpeed, Math.hypot(cell.getVx(), cell.getVy()) * tickScale);
            }
        }
        double maxStepDistance = Math.max(1.0, baseConfig.getCollision().getMaxStepDistance());
        int maxSubsteps = Math.max(1, baseConfig.getCollision().getMaxSubsteps());
        int requiredSubsteps = (int) Math.ceil(maxSpeed / maxStepDistance);
        return Math.max(1, Math.min(maxSubsteps, requiredSubsteps));
    }
}
