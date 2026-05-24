package com.hellengi.biolab.domain.spawn;

import com.hellengi.biolab.api.dto.GenomeDto;
import com.hellengi.biolab.api.dto.SpawnCellRequestDto;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.Genome;
import com.hellengi.biolab.mapper.api.GenomeMapper;
import com.hellengi.biolab.domain.physics.Forces;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Random;

@Component
@RequiredArgsConstructor
public class CellFactory {
    private final YamlConfig config;
    private final Forces forces;
    private final GenomeMapper genomeMapper;
    private final Random random = new Random();

    public Cell createCell(SpawnCellRequestDto requestDto) {
        GenomeDto genomeDto = requestDto.genome();
        double x = requestDto.x();
        double y = requestDto.y();
        Genome genome = genomeMapper.toDomain(genomeDto);

        double initialEnergy = Math.min(
                config.getCell().getStartEnergy(),
                genome.getMaxEnergy()
        );

        double safeX = forces.clampInsideCircleX(x, y, 0.0);
        double safeY = forces.clampInsideCircleY(x, y, 0.0);

        double angleRad = Math.toRadians(requestDto.initialDirection() - 90.0);
        double initialSpeed = Math.max(0.0, requestDto.initialSpeed());
        double vx = Math.cos(angleRad) * initialSpeed;
        double vy = Math.sin(angleRad) * initialSpeed;

        Cell cell = new Cell(config);
        cell.setPosition(forces.clampX(safeX), forces.clampY(safeY));
        cell.setVelocity(vx, vy);
        cell.setEnergy(initialEnergy);
        cell.setGenome(genome);
        cell.setDirectionAngle(requestDto.initialDirection());
        return cell;
    }

    public Cell createRandomCell() {
        Genome genome = createInitialGenome();
        double initialDirection = config.getMotion().getCellDirection().getInitial();
        double initialSpeed = config.getMotion().getCellSpeed().getInitial();
        Velocity velocity = velocityFromDirection(initialDirection, initialSpeed);

        double initialEnergy = config.getCell().getStartEnergy();

        double x = config.worldCenterX() + randomOffset(config.getCell().getOffsetRange());
        double y = config.worldCenterY() + randomOffset(config.getCell().getOffsetRange());

        Cell cell = new Cell(config);
        cell.setPosition(x, y);
        cell.setVelocity(velocity.vx(), velocity.vy());
        cell.setEnergy(Math.min(initialEnergy, genome.getMaxEnergy()));
        cell.setGenome(genome);
        cell.setDirectionAngle(initialDirection);
        return cell;
    }

    private Genome createInitialGenome() {
        return genomeMapper.toDomain(config.getGenome());
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

    private double randomOffset(double halfRange) {
        return random.nextDouble() * 2.0 * halfRange - halfRange;
    }
}