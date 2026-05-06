package com.hellengi.biolab.simulation.mapper;

import com.hellengi.biolab.api.dto.CellDto;
import com.hellengi.biolab.api.presentation.RenderMetrics;
import com.hellengi.biolab.model.Cell;
import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Genome;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CellMapper {
    private final RenderMetrics renderMetrics;
    private final GenomeMapper genomeMapper;

    public CellDto toDto(Cell cell) {
        Genome genome = cell.getGenome();

        return new CellDto(
                cell.getId(),
                cell.getX(),
                cell.getY(),
                cell.getVx(),
                cell.getVy(),
                cell.getEnergy(),
                renderMetrics.calculateCellRadius(cell.getEnergy(), genome.getDivisionThreshold()),
                false,
                genomeMapper.toDto(genome),
                0L,
                0L
        );
    }

    public CellDto toDto(DeadCell deadCell, long maxLifetimeTicks) {
        return new CellDto(
                deadCell.getId(),
                deadCell.getX(),
                deadCell.getY(),
                deadCell.getVx(),
                deadCell.getVy(),
                deadCell.getEnergy(),
                renderMetrics.calculateDeadCellRadius(deadCell.getEnergy()),
                true,
                null,
                Math.round(deadCell.getLifetimeTicks()),
                maxLifetimeTicks
        );
    }

    public Cell toCell(CellDto dto) {
        return new Cell(
                dto.id(),
                dto.x(),
                dto.y(),
                dto.vx(),
                dto.vy(),
                dto.energy(),
                genomeMapper.toDomain(dto.genome())
        );
    }

    public DeadCell toDeadCell(CellDto dto) {
        return new DeadCell(
                dto.id(),
                dto.x(),
                dto.y(),
                dto.vx(),
                dto.vy(),
                dto.energy(),
                dto.lifetimeTicks()
        );
    }
}