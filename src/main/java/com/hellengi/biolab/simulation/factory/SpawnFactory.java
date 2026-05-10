package com.hellengi.biolab.simulation.factory;

import com.hellengi.biolab.api.dto.GenomeDto;
import com.hellengi.biolab.api.dto.SpawnCellRequestDto;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.Cell;
import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Food;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.simulation.mapper.GenomeMapper;
import com.hellengi.biolab.simulation.physics.CellMetrics;
import com.hellengi.biolab.simulation.physics.CellPhysics;
import com.hellengi.biolab.util.IdGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Random;

@Component
@RequiredArgsConstructor
public class SpawnFactory {
    private final YamlConfig config;
    private final CellPhysics cellPhysics;
    private final GenomeMapper genomeMapper;
    private final CellMetrics cellMetrics;
    private final Random random = new Random();

    public Cell createRandomCell(double centerX, double centerY) {
        Genome genome = createInitialGenome();
        double initialDirection = config.getMotion().getCellDirection().getInitial();
        double initialSpeed = config.getMotion().getCellSpeed().getInitial();
        Velocity velocity = velocityFromDirection(initialDirection, initialSpeed);

        double initialEnergy = config.getCell().getStartEnergy();

        double x = config.worldCenterX() + randomOffset(config.getCell().getOffsetRange());
        double y = config.worldCenterY() + randomOffset(config.getCell().getOffsetRange());

        Cell cell = new Cell(
                IdGenerator.nextId(),
                x,
                y,
                velocity.vx(),
                velocity.vy(),
                Math.min(initialEnergy, genome.getMaxEnergy()),
                genome
        );
        cell.setDirectionAngle(initialDirection);
        return cell;
    }

    private Genome createInitialGenome() {
        return genomeMapper.toDomain(config.getGenome());
    }

    public Cell createCell(SpawnCellRequestDto requestDto) {
        GenomeDto genomeDto = requestDto.genome();
        double x = requestDto.x();
        double y = requestDto.y();
        Genome genome = genomeMapper.toDomain(genomeDto);

        double initialEnergy = Math.min(
                config.getCell().getStartEnergy(),
                genome.getMaxEnergy()
        );

        double safeX = cellPhysics.clampInsideCircleX(x, y, 0.0);
        double safeY = cellPhysics.clampInsideCircleY(x, y, 0.0);

        double angleRad = Math.toRadians(requestDto.initialDirection() - 90.0);
        double initialSpeed = Math.max(0.0, requestDto.initialSpeed());
        double vx = Math.cos(angleRad) * initialSpeed;
        double vy = Math.sin(angleRad) * initialSpeed;

        Cell cell = new Cell(
                IdGenerator.nextId(),
                cellPhysics.clampX(safeX),
                cellPhysics.clampY(safeY),
                vx,
                vy,
                initialEnergy,
                genome
        );
        cell.setDirectionAngle(requestDto.initialDirection());
        return cell;
    }

    private Velocity velocityFromDirection(double directionAngle, double speed) {
        double angleRad = Math.toRadians(directionAngle - 90.0);

        return new Velocity(
                Math.cos(angleRad) * speed,
                Math.sin(angleRad) * speed
        );
    }

    private record Velocity(double vx, double vy) {
    }

    public Food createRandomFood() {
        double angle = random.nextDouble() * Math.PI * 2.0;
        double distance = Math.sqrt(random.nextDouble()) * config.worldRadius();

        double x = config.worldCenterX() + Math.cos(angle) * distance;
        double y = config.worldCenterY() + Math.sin(angle) * distance;
        double energy = config.getFood().getMinEnergy()
                + random.nextDouble() * (config.getFood().getMaxEnergy() - config.getFood().getMinEnergy());

        return new Food(IdGenerator.nextId(), x, y, energy);
    }

    public Food createFoodAtPosition(double x, double y, double energy) {
        return new Food(
                IdGenerator.nextId(),
                x,
                y,
                Math.max(config.getFood().getMinEnergy(), energy)
        );
    }

    public DeadCell createDeadCellFromCell(Cell cell) {
        return new DeadCell(
                IdGenerator.nextId(),
                cell.getX(),
                cell.getY(),
                cell.getVx(),
                cell.getVy(),
                cell.getEnergy(),
                cellMetrics.currentMass(cell)
        );
    }

    private double randomOffset(double halfRange) {
        return random.nextDouble() * 2.0 * halfRange - halfRange;
    }
}