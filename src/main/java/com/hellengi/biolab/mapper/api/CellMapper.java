package com.hellengi.biolab.mapper.api;

import com.hellengi.biolab.api.dto.CellDto;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.Genome;
import com.hellengi.biolab.domain.physics.Lighting;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CellMapper {
    private final YamlConfig config;
    private final GenomeMapper genomeMapper;
    private final CellMotionMapper cellMotionMapper;
    private final Lighting lighting;

    public CellDto toDto(Cell cell) {
        boolean dead = !cell.isAlive();

        double localLight = lighting.computeLocalLight(
                cell.getX(),
                cell.getY()
        );

        return new CellDto(
                cell.getId(),
                cell.getX(),
                cell.getY(),
                cell.getVx(),
                cell.getVy(),
                cell.getEnergy(),
                cell.getRadius(),
                dead,
                genomeMapper.toDto(cell.getGenome()),
                Math.round(cell.getLifetimeTicks()),
                localLight,
                cell.getMass(),
                cell.getDensity(),
                cellMotionMapper.toDto(cell),
                cell.getDirectionAngle()
        );
    }

    public Cell toDomain(CellDto dto) {
        Genome genome = genomeMapper.toDomain(dto.genome());
        Cell cell = new Cell(config);
        cell.setPosition(dto.x(), dto.y());
        cell.setVelocity(dto.vx(), dto.vy());
        cell.setEnergy(dto.energy());
        cell.setGenome(genome);
        cell.setAlive(!dto.dead());
        cell.setDirectionAngle(dto.directionAngle());
        cell.setLifetimeTicks(dto.lifetimeTicks());
        cell.setMass(dto.mass());

        return cell;
    }
}