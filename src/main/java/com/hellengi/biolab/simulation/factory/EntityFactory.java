package com.hellengi.biolab.simulation.factory;

import com.hellengi.biolab.api.dto.GenomeDto;
import com.hellengi.biolab.config.SimulationProperties;
import com.hellengi.biolab.model.Cell;
import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Food;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.simulation.physics.WorldPhysics;
import com.hellengi.biolab.util.IdGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Random;

@Component
@RequiredArgsConstructor
public class EntityFactory {
    private final SimulationProperties config;
    private final WorldPhysics worldPhysics;
    private final Random random = new Random();

    public Cell createRandomCell(double centerX, double centerY) {
        Genome genome = createInitialGenome();
        Velocity velocity = randomVelocity(genome.getDivisionImpulseStrength());

        double initialEnergy = config.getCell().getEnergyMin()
                + random.nextDouble() * config.getCell().getEnergyRange();

        double x = centerX + randomOffset(config.getSpawn().getOffsetRange());
        double y = centerY + randomOffset(config.getSpawn().getOffsetRange());

        return new Cell(
                IdGenerator.nextId(),
                x,
                y,
                velocity.vx(),
                velocity.vy(),
                Math.min(initialEnergy, genome.getMaxEnergy()),
                genome
        );
    }

    private Genome createInitialGenome() {
        return new Genome(
                config.getGenome().getInitial().getDivisionThreshold(),
                config.getGenome().getInitial().getDivisionImpulse(),
                config.getGenome().getInitial().getColorHue(),
                config.getGenome().getInitial().getSaturation(),
                config.getGenome().getInitial().getLightness(),
                config.getGenome().getInitial().getMaxEnergy()
        );
    }

    public Cell createCell(GenomeDto genomeDto, double x, double y) {
        Genome genome = createGenome(genomeDto);
        Velocity velocity = randomVelocity(genome.getDivisionImpulseStrength());

        double initialEnergy = Math.max(
                config.getCell().getMinEnergy(),
                genome.getMaxEnergy() / 2.0
        );

        return new Cell(
                IdGenerator.nextId(),
                worldPhysics.clampX(x),
                worldPhysics.clampY(y),
                velocity.vx(),
                velocity.vy(),
                initialEnergy,
                genome
        );
    }

    private Genome createGenome(GenomeDto dto) {
        return new Genome(
                dto.divisionThreshold(),
                dto.divisionImpulseStrength(),
                dto.colorHue(),
                dto.saturation(),
                dto.lightness(),
                dto.maxEnergy()
        );
    }

    private Velocity randomVelocity(double speed) {
        double angle = random.nextDouble() * Math.PI * 2.0;

        return new Velocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
        );
    }

    private record Velocity(double vx, double vy) {
    }

    public Food createRandomFood() {
        double x = random.nextDouble() * config.getWidth();
        double y = random.nextDouble() * config.getHeight();
        double energy = config.getFood().getEnergyMin()
                + random.nextDouble() * config.getFood().getEnergyRange();

        return new Food(IdGenerator.nextId(), x, y, energy);
    }

    public Food createFoodAtPosition(double x, double y, double energy) {
        return new Food(
                IdGenerator.nextId(),
                x,
                y,
                Math.max(config.getFood().getEnergyMin(), energy)
        );
    }

    public DeadCell createDeadCellFromCell(Cell cell) {
        return new DeadCell(
                IdGenerator.nextId(),
                cell.getX(),
                cell.getY(),
                cell.getVx(),
                cell.getVy(),
                cell.getEnergy()
        );
    }

    private double randomOffset(double halfRange) {
        return random.nextDouble() * 2.0 * halfRange - halfRange;
    }
}