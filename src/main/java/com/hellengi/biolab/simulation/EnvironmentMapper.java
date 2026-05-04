package com.hellengi.biolab.simulation;

import com.hellengi.biolab.api.dto.*;
import com.hellengi.biolab.api.presentation.RenderMapper;
import com.hellengi.biolab.config.SimulationProperties;
import com.hellengi.biolab.model.Cell;
import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Food;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.simulation.world.SimulationEnvironment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class EnvironmentMapper {
    private final SimulationProperties config;
    private final RenderMapper renderMapper;

    public EnvironmentDto toDto(
            SimulationEnvironment env,
            long deadCellLifetimeTicks
    ) {
        List<CellDto> cellDtos = env.getCells().stream()
                .map(this::toCellDto)
                .toList();

        List<CellDto> deadCellDtos = env.getDeadCells().stream()
                .map(deadCell -> toDeadCellDto(deadCell, deadCellLifetimeTicks))
                .toList();

        List<FoodDto> foodDtos = env.getFoods().stream()
                .map(this::toFoodDto)
                .toList();

        return new EnvironmentDto(
                env.getTick(),
                config.getWidth(),
                config.getHeight(),
                env.isRunning(),
                cellDtos,
                deadCellDtos,
                foodDtos
        );
    }

    private CellDto toCellDto(Cell cell) {
        Genome genome = cell.getGenome();

        return new CellDto(
                cell.getId(),
                cell.getX(),
                cell.getY(),
                cell.getVx(),
                cell.getVy(),
                cell.getEnergy(),
                renderMapper.calculateCellRadius(cell.getEnergy(), genome.getDivisionThreshold()),
                false,
                toGenomeDto(genome),
                0L,
                0L
        );
    }

    private CellDto toDeadCellDto(DeadCell deadCell, long maxLifetimeTicks) {
        return new CellDto(
                deadCell.getId(),
                deadCell.getX(),
                deadCell.getY(),
                deadCell.getVx(),
                deadCell.getVy(),
                deadCell.getEnergy(),
                renderMapper.calculateDeadCellRadius(deadCell.getEnergy()),
                true,
                null,
                deadCell.getLifetimeTicks(),
                maxLifetimeTicks
        );
    }

    private FoodDto toFoodDto(Food food) {
        return new FoodDto(
                food.getId(),
                food.getX(),
                food.getY(),
                food.getEnergy(),
                renderMapper.calculateFoodRadius(food.getEnergy()),
                food.isConsumed()
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
                toGenome(dto.genome())
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

    public Food toFood(FoodDto dto) {
        Food food = new Food(
                dto.id(),
                dto.x(),
                dto.y(),
                dto.energy()
        );

        food.setConsumed(dto.consumed());
        return food;
    }

    public Genome toGenome(GenomeDto dto) {
        return new Genome(
                dto.divisionThreshold(),
                dto.divisionImpulseStrength(),
                dto.colorHue(),
                dto.saturation(),
                dto.lightness(),
                dto.maxEnergy()
        );
    }

    private GenomeDto toGenomeDto(Genome genome) {
        return new GenomeDto(
                genome.getDivisionThreshold(),
                genome.getDivisionImpulseStrength(),
                genome.getColorHue(),
                genome.getSaturation(),
                genome.getLightness(),
                genome.getMaxEnergy(),
                genome.getCode()
        );
    }
}