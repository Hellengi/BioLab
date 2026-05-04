package com.hellengi.biolab.simulation.lifecycle;

import com.hellengi.biolab.config.SimulationProperties;
import com.hellengi.biolab.model.Cell;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.api.presentation.RenderMapper;
import com.hellengi.biolab.simulation.mutation.GenomeMutationService;
import com.hellengi.biolab.simulation.physics.WorldPhysics;
import com.hellengi.biolab.util.IdGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class CellDivisionService {
    private final SimulationProperties baseConfig;
    private final GenomeMutationService genomeMutationService;
    private final WorldPhysics worldPhysics;
    private final RenderMapper renderMapper;

    private final Random random = new Random();

    public List<Cell> divide(Cell parent) {
        Genome firstGenome = genomeMutationService.copyGenomeWithPossibleMutation(parent.getGenome());
        Genome secondGenome = genomeMutationService.copyGenomeWithPossibleMutation(parent.getGenome());

        double firstDivisionImpulse = firstGenome.getDivisionImpulseStrength();
        double secondDivisionImpulse = secondGenome.getDivisionImpulseStrength();

        double firstImpulseEnergyCost =
                firstDivisionImpulse * baseConfig.getSpawn().getDivisionImpulseCost();
        double secondImpulseEnergyCost =
                secondDivisionImpulse * baseConfig.getSpawn().getDivisionImpulseCost();

        double remainingEnergy =
                parent.getEnergy() - firstImpulseEnergyCost - secondImpulseEnergyCost;

        double baseChildEnergy = remainingEnergy / 2.0;

        double firstChildEnergy = Math.min(baseChildEnergy, firstGenome.getMaxEnergy());
        double secondChildEnergy = Math.min(baseChildEnergy, secondGenome.getMaxEnergy());

        if (firstChildEnergy < baseConfig.getSpawn().getMinChildEnergy()
                || secondChildEnergy < baseConfig.getSpawn().getMinChildEnergy()) {
            return List.of();
        }

        double angle = random.nextDouble() * Math.PI * 2.0;
        double directionX = Math.cos(angle);
        double directionY = Math.sin(angle);

        double firstChildRadius = renderMapper.calculateCellRadius(
                firstChildEnergy,
                firstGenome.getDivisionThreshold()
        );
        double secondChildRadius = renderMapper.calculateCellRadius(
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
                worldPhysics.clampX(firstChildX),
                worldPhysics.clampY(firstChildY),
                firstChildVx,
                firstChildVy,
                firstChildEnergy,
                firstGenome
        );

        Cell secondChild = new Cell(
                IdGenerator.nextId(),
                worldPhysics.clampX(secondChildX),
                worldPhysics.clampY(secondChildY),
                secondChildVx,
                secondChildVy,
                secondChildEnergy,
                secondGenome
        );

        return List.of(firstChild, secondChild);
    }
}