package com.hellengi.biolab.domain;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.physics.Collision;
import com.hellengi.biolab.domain.physics.Forces;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Mutates movement/collision characteristics of existing cells; never changes world collections. */
@Component
@RequiredArgsConstructor
final class PhysicsProcessor {
    private final YamlConfig baseConfig;
    private final Collision collision;
    private final Forces forces;

    void process(SimulationWorld world, double tickScale) {
        int substeps = calculateCollisionSubsteps(world, tickScale);
        double stepScale = tickScale / substeps;

        for (int i = 0; i < substeps; i++) {
            for (Cell cell : world.getCells()) {
                if (!cell.isMarkedForRemoval()) {
                    forces.move(cell, cell.getRadius(), stepScale);
                }
            }
            collision.resolveAll(world.getCells());
            for (Cell cell : world.getCells()) {
                if (!cell.isMarkedForRemoval()) {
                    collision.keepInside(cell, cell.getRadius());
                }
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
