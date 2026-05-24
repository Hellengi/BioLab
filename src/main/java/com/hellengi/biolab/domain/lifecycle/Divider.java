package com.hellengi.biolab.domain.lifecycle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.Genome;
import com.hellengi.biolab.domain.physics.Forces;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class Divider {
    private final YamlConfig config;
    private final Mutator mutator;
    private final Forces forces;

    public List<Cell> divide(Cell parent) {
        Genome firstGenome = mutator.copyGenomeWithPossibleMutation(parent.getGenome());
        Genome secondGenome = mutator.copyGenomeWithPossibleMutation(parent.getGenome());

        double firstDivisionImpulse = firstGenome.getDivisionImpulse();
        double secondDivisionImpulse = secondGenome.getDivisionImpulse();

        double firstImpulseEnergyCost =
                firstDivisionImpulse * config.getCell().getEnergyToDivisionImpulseFactor();
        double secondImpulseEnergyCost =
                secondDivisionImpulse * config.getCell().getEnergyToDivisionImpulseFactor();

        double remainingEnergy =
                parent.getEnergy() - firstImpulseEnergyCost - secondImpulseEnergyCost;

        double baseChildEnergy = remainingEnergy / 2.0;

        double firstEnergy = Math.min(baseChildEnergy, firstGenome.getMaxEnergy());
        double secondEnergy = Math.min(baseChildEnergy, secondGenome.getMaxEnergy());

        double divisionAxisAngle = Math.toRadians(parent.getDirectionAngle())
                + Math.toRadians(parent.getGenome().getDivisionAngle());

        double directionX = Math.cos(divisionAxisAngle);
        double directionY = Math.sin(divisionAxisAngle);

        double firstVx = parent.getVx() + directionX * firstDivisionImpulse;
        double firstVy = parent.getVy() + directionY * firstDivisionImpulse;

        double secondVx = parent.getVx() - directionX * secondDivisionImpulse;
        double secondVy = parent.getVy() - directionY * secondDivisionImpulse;

        Cell first = new Cell(config);
        first.setVelocity(firstVx, firstVy);
        first.setEnergy(firstEnergy);
        first.setGenome(firstGenome);
        first.setDirectionAngle(parent.getDirectionAngle());

        Cell second = new Cell(config);
        second.setVelocity(secondVx, secondVy);
        second.setEnergy(secondEnergy);
        second.setGenome(secondGenome);
        second.setDirectionAngle(parent.getDirectionAngle());

        double distanceBetweenCenters = first.getRadius() + second.getRadius();
        double offsetFromParent = distanceBetweenCenters / 2.0;

        double firstX = forces.clampX(parent.getX() + directionX * offsetFromParent);
        double firstY = forces.clampX(parent.getY() + directionY * offsetFromParent);

        double secondX = forces.clampX(parent.getX() - directionX * offsetFromParent);
        double secondY = forces.clampX(parent.getY() - directionY * offsetFromParent);

        first.setPosition(firstX, firstY);
        second.setPosition(secondX, secondY);

        return List.of(first, second);
    }
}