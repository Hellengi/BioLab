package com.hellengi.biolab.simulation.mapper;

import com.hellengi.biolab.api.dto.CellDto;
import com.hellengi.biolab.api.dto.CellMotionDto;
import com.hellengi.biolab.simulation.physics.FoodMetrics;
import com.hellengi.biolab.model.Cell;
import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.simulation.lighting.LightingSystem;
import com.hellengi.biolab.simulation.physics.CellMetrics;
import com.hellengi.biolab.simulation.physics.CellPhysics;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CellMapper {
    private final FoodMetrics foodMetrics;
    private final GenomeMapper genomeMapper;
    private final LightingSystem lightingSystem;
    private final CellMetrics cellMetrics;
    private final CellPhysics cellPhysics;

    public CellDto toDto(Cell cell) {
        Genome genome = cell.getGenome();
        double localLight = lightingSystem.computeLocalLight(cell.getX(), cell.getY());
        double radius = cellMetrics.radius(cell.getEnergy(), genome.getDivisionThreshold());
        double mass = cellMetrics.currentMass(cell);

        return new CellDto(
                cell.getId(),
                cell.getX(),
                cell.getY(),
                cell.getVx(),
                cell.getVy(),
                cell.getEnergy(),
                radius,
                false,
                genomeMapper.toDto(genome),
                0L,
                0L,
                localLight,
                mass,
                cellMetrics.density(mass, radius),
                motionDto(cell, radius, mass),
                cell.getDirectionAngle()
        );
    }

    public CellDto toDto(DeadCell deadCell, long maxLifetimeTicks) {
        double localLight = lightingSystem.computeLocalLight(deadCell.getX(), deadCell.getY());
        double radius = cellMetrics.deadCellRadius(deadCell.getEnergy());
        double mass = deadCell.getMass();

        return new CellDto(
                deadCell.getId(),
                deadCell.getX(),
                deadCell.getY(),
                deadCell.getVx(),
                deadCell.getVy(),
                deadCell.getEnergy(),
                radius,
                true,
                null,
                Math.round(deadCell.getLifetimeTicks()),
                maxLifetimeTicks,
                localLight,
                mass,
                cellMetrics.density(mass, radius),
                null,
                0.0
        );
    }

    public Cell toCell(CellDto dto) {
        Cell cell = new Cell(
                dto.id(),
                dto.x(),
                dto.y(),
                dto.vx(),
                dto.vy(),
                dto.energy(),
                genomeMapper.toDomain(dto.genome())
        );
        cell.setDirectionAngle(dto.directionAngle());
        return cell;
    }

    public DeadCell toDeadCell(CellDto dto) {
        return new DeadCell(
                dto.id(),
                dto.x(),
                dto.y(),
                dto.vx(),
                dto.vy(),
                dto.energy(),
                dto.mass(),
                dto.lifetimeTicks()
        );
    }

    private CellMotionDto motionDto(Cell cell, double radius, double mass) {
        double speed = Math.sqrt(cell.getVx() * cell.getVx() + cell.getVy() * cell.getVy());

        double velocityDirX = 0.0;
        double velocityDirY = 0.0;
        double dragDirX = 0.0;
        double dragDirY = 0.0;

        if (speed > 0.000001) {
            velocityDirX = cell.getVx() / speed;
            velocityDirY = cell.getVy() / speed;
            dragDirX = -velocityDirX;
            dragDirY = -velocityDirY;
        }

        double gravityBuoyancyForce = cellPhysics.calculateGravityBuoyancyForce(cell, radius);
        double gravityBuoyancyDirY = Math.signum(gravityBuoyancyForce);

        return new CellMotionDto(
                speed,

                gravityBuoyancyForce,
                0.0,
                gravityBuoyancyDirY,

                cellPhysics.calculateDragForce(cell, radius, mass),
                dragDirX,
                dragDirY,

                velocityDirX,
                velocityDirY,

                cell.getCollisionImpulseId(),
                cell.getCollisionImpulse(),
                cell.getCollisionNormalX(),
                cell.getCollisionNormalY()
        );
    }
}