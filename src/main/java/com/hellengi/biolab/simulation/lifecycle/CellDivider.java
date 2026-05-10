package com.hellengi.biolab.simulation.lifecycle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.Cell;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.simulation.physics.CellMetrics;
import com.hellengi.biolab.simulation.mutation.GenomeMutator;
import com.hellengi.biolab.simulation.physics.CellPhysics;
import com.hellengi.biolab.util.IdGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class CellDivider {
    private final YamlConfig baseConfig;
    private final GenomeMutator genomeMutator;
    private final CellPhysics cellPhysics;
    private final CellMetrics cellMetrics;

    public List<Cell> divide(Cell parent) {
        Genome firstGenome = genomeMutator.copyGenomeWithPossibleMutation(parent.getGenome());
        Genome secondGenome = genomeMutator.copyGenomeWithPossibleMutation(parent.getGenome());

        double firstDivisionImpulse = firstGenome.getDivisionImpulse();
        double secondDivisionImpulse = secondGenome.getDivisionImpulse();

        double firstImpulseEnergyCost =
                firstDivisionImpulse * baseConfig.getCell().getEnergyToDivisionImpulseFactor();
        double secondImpulseEnergyCost =
                secondDivisionImpulse * baseConfig.getCell().getEnergyToDivisionImpulseFactor();

        double remainingEnergy =
                parent.getEnergy() - firstImpulseEnergyCost - secondImpulseEnergyCost;

        double baseChildEnergy = remainingEnergy / 2.0;

        double firstChildEnergy = Math.min(baseChildEnergy, firstGenome.getMaxEnergy());
        double secondChildEnergy = Math.min(baseChildEnergy, secondGenome.getMaxEnergy());

        double divisionAxisAngle = Math.toRadians(parent.getDirectionAngle())
                + Math.toRadians(parent.getGenome().getDivisionAngle());

        double directionX = Math.cos(divisionAxisAngle);
        double directionY = Math.sin(divisionAxisAngle);

        double firstChildRadius = cellMetrics.radius(
                firstChildEnergy,
                firstGenome.getDivisionThreshold()
        );
        double secondChildRadius = cellMetrics.radius(
                secondChildEnergy,
                secondGenome.getDivisionThreshold()
        );

        double distanceBetweenCenters = firstChildRadius + secondChildRadius;
        double offsetFromParent = distanceBetweenCenters / 2.0;

        double firstChildX = parent.getX() + directionX * offsetFromParent;
        double firstChildY = parent.getY() + directionY * offsetFromParent;

        double secondChildX = parent.getX() - directionX * offsetFromParent;
        double secondChildY = parent.getY() - directionY * offsetFromParent;

        double firstChildVx = parent.getVx() + directionX * firstDivisionImpulse;
        double firstChildVy = parent.getVy() + directionY * firstDivisionImpulse;

        double secondChildVx = parent.getVx() - directionX * secondDivisionImpulse;
        double secondChildVy = parent.getVy() - directionY * secondDivisionImpulse;

        Cell firstChild = new Cell(
                IdGenerator.nextId(),
                cellPhysics.clampX(firstChildX),
                cellPhysics.clampY(firstChildY),
                firstChildVx,
                firstChildVy,
                firstChildEnergy,
                firstGenome
        );
        firstChild.setDirectionAngle(parent.getDirectionAngle());

        Cell secondChild = new Cell(
                IdGenerator.nextId(),
                cellPhysics.clampX(secondChildX),
                cellPhysics.clampY(secondChildY),
                secondChildVx,
                secondChildVy,
                secondChildEnergy,
                secondGenome
        );
        secondChild.setDirectionAngle(parent.getDirectionAngle());

        return List.of(firstChild, secondChild);
    }
}