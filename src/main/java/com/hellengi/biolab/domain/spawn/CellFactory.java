package com.hellengi.biolab.domain.spawn;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.Genome;
import com.hellengi.biolab.domain.physics.MotionForces;
import com.hellengi.biolab.dto.CellDto;
import com.hellengi.biolab.dto.SpawnCellRequestDto;
import com.hellengi.biolab.dto.domain_mapper.CellMapper;
import com.hellengi.biolab.dto.domain_mapper.GenomeMapper;
import static com.hellengi.biolab.util.Utils.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Random;

@Component
@RequiredArgsConstructor
public class CellFactory {
    private final YamlConfig baseConfig;
    private final CellMapper cellMapper;
    private final GenomeMapper genomeMapper;
    private final MotionForces motionForces;
    private final Random random = new Random();

    public void fill(SimulationWorld world, int amount) {
        for (int i = 0; i < amount; i++) {
            world.addCell(createRandomCell());
        }
    }

    public void loadSnapshot(SimulationWorld world, List<CellDto> cells) {
        if (cells != null) {
            for (CellDto dto : cells) {
                world.addCell(cellMapper.toDomain(dto));
            }
        }
    }

    public Cell createCell(SpawnCellRequestDto requestDto) {
        Genome genome = genomeMapper.toDomain(requestDto.genome());
        double initialEnergy = Math.min(baseConfig.getCell().getStartEnergy(), genome.getMaxEnergy());
        Point worldCenter = new Point(baseConfig.worldCenterX(), baseConfig.worldCenterX());
        Point point = clampInsideCircle(worldCenter, baseConfig.worldRadius(), requestDto.x(), requestDto.y());
        Velocity velocity = toVelocity(
                requestDto.initialDirection(), Math.max(0.0, requestDto.initialSpeed())
        );

        Cell cell = new Cell(baseConfig);
        cell.setPosition(point.x(), point.y());
        cell.setVelocity(velocity.vx(), velocity.vy());
        cell.setEnergy(initialEnergy);
        cell.setGenome(genome);
        cell.setDirectionAngle(requestDto.initialDirection());
        return cell;
    }

    public Cell createRandomCell() {
        Genome genome = createInitialGenome();
        double initialDirection = baseConfig.getMotion().getCellDirection().getInitial();
        double initialSpeed = baseConfig.getMotion().getCellSpeed().getInitial();
        Velocity velocity = toVelocity(initialDirection, initialSpeed);
        double initialEnergy = baseConfig.getCell().getStartEnergy();
        double x = baseConfig.worldCenterX() + randomOffset(baseConfig.getCell().getOffsetRange());
        double y = baseConfig.worldCenterY() + randomOffset(baseConfig.getCell().getOffsetRange());

        Cell cell = new Cell(baseConfig);
        cell.setPosition(x, y);
        cell.setVelocity(velocity.vx(), velocity.vy());
        cell.setEnergy(Math.min(initialEnergy, genome.getMaxEnergy()));
        cell.setGenome(genome);
        cell.setDirectionAngle(initialDirection);
        return cell;
    }

    private Genome createInitialGenome() {
        YamlConfig.GenomeProperties genome = baseConfig.getGenome();
        return new Genome(
                genome.getDivisionThreshold().getInitial(),
                genome.getDivisionImpulse().getInitial(),
                genome.getDivisionAngle().getInitial(),
                genome.getColorHue().getInitial(),
                genome.getSaturation().getInitial(),
                genome.getLightness().getInitial(),
                genome.getMaxEnergy().getInitial(),
                genome.getDryMass().getInitial(),
                genome.getElasticity().getInitial()
        );
    }

    private double randomOffset(double halfRange) {
        return random.nextDouble() * 2.0 * halfRange - halfRange;
    }
}