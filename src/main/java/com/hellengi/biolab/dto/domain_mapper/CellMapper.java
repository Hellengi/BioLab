package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.physics.Lighting;
import com.hellengi.biolab.dto.CellDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Maps between {@link Cell} domain objects and {@link CellDto}.
 *
 * localLight is sampled from the light map prepared once in SimulationWorldMapper.
 */
@Component
@RequiredArgsConstructor
public class CellMapper {
    private final YamlConfig config;
    private final GenomeMapper genomeMapper;
    private final CellEventMapper cellEventMapper;
    private final CellMotionMapper cellMotionMapper;
    private final Lighting lighting;

    private double[] cachedLightMap;
    private int cachedLightCols;
    private int cachedLightRows;
    private int cachedGridStep;

    public void useLightMap(double[] lightMap, int cols, int rows, int gridStep) {
        this.cachedLightMap = lightMap;
        this.cachedLightCols = cols;
        this.cachedLightRows = rows;
        this.cachedGridStep = Math.max(1, gridStep);
    }

    public void clearLightMap() {
        this.cachedLightMap = null;
        this.cachedLightCols = 0;
        this.cachedLightRows = 0;
        this.cachedGridStep = 0;
    }

    /**
     * Kept for compatibility with old callers.
     */
    public void prepareLightMap() {
        int diameter = config.getTubeDiameter();
        int gridStep = Math.max(1, config.getLight().getGridStep());
        int cols = (int) Math.ceil(diameter / (double) gridStep);
        int rows = (int) Math.ceil(diameter / (double) gridStep);
        useLightMap(lighting.buildLightMap(diameter, diameter, gridStep), cols, rows, gridStep);
    }

    public CellDto toDto(Cell cell) {
        double localLight = (cachedLightMap != null)
                ? lighting.sampleLightMap(
                cachedLightMap, cachedLightCols, cachedLightRows,
                cachedGridStep, cell.getX(), cell.getY())
                : lighting.computeLocalLight(cell.getX(), cell.getY());

        return new CellDto(
                cell.getId(),
                cell.getX(),
                cell.getY(),
                cell.getVx(),
                cell.getVy(),
                cell.getEnergy(),
                cell.getRadius(),
                !cell.isAlive(),
                genomeMapper.toDto(cell.getGenome()),
                Math.round(cell.getLifetimeTicks()),
                localLight,
                cell.getMass(),
                cell.getDensity(),
                cellEventMapper.toDtoList(cell.getEvents()),
                cellMotionMapper.toDto(cell),
                cell.getDirectionAngle()
        );
    }

    public Cell toDomain(CellDto dto) {
        Cell cell = new Cell(dto.id(), config);
        cell.setPosition(dto.x(), dto.y());
        cell.setVelocity(dto.vx(), dto.vy());
        cell.setEnergy(dto.energy());
        cell.setGenome(genomeMapper.toDomain(dto.genome()));
        cell.setAlive(!dto.dead());
        cell.setDirectionAngle(dto.directionAngle());
        cell.setLifetimeTicks(dto.lifetimeTicks());
        cell.setMass(dto.mass());
        cell.setEvents(cellEventMapper.toDomainList(dto.events()));
        return cell;
    }
}
