package com.hellengi.biolab.service;

import com.hellengi.biolab.config.SimulationProperties;
import com.hellengi.biolab.dto.DeadCellDto;
import com.hellengi.biolab.dto.FoodDto;
import com.hellengi.biolab.dto.GenomeDto;
import com.hellengi.biolab.dto.SaprotrophDto;
import com.hellengi.biolab.dto.WorldStateDto;
import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Food;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.model.Saprotroph;
import com.hellengi.biolab.util.GenomeCodeCodec;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class SimulationMapper {

    private final SimulationProperties config;

    public SimulationMapper(SimulationProperties config) {
        this.config = config;
    }

    public WorldStateDto toWorldStateDto(
            SimulationWorld world,
            long deadCellLifetimeTicks
    ) {
        List<SaprotrophDto> saprotrophDtos = world.getSaprotrophs().stream()
                .map(saprotroph -> new SaprotrophDto(
                        saprotroph.getId(),
                        saprotroph.getX(),
                        saprotroph.getY(),
                        saprotroph.getVx(),
                        saprotroph.getVy(),
                        saprotroph.getEnergy(),
                        toGenomeDto(saprotroph.getGenome(), saprotroph.getEnergy()),
                        calculateSaprotrophRadius(
                                saprotroph.getEnergy(),
                                saprotroph.getGenome().getDivisionThreshold()
                        ),
                        saprotroph.isAlive()
                ))
                .toList();

        List<DeadCellDto> deadCellDtos = world.getDeadCells().stream()
                .map(deadCell -> new DeadCellDto(
                        deadCell.getId(),
                        deadCell.getX(),
                        deadCell.getY(),
                        deadCell.getVx(),
                        deadCell.getVy(),
                        deadCell.getEnergy(),
                        calculateDeadCellRadius(deadCell.getEnergy()),
                        deadCell.getLifetimeTicks(),
                        deadCellLifetimeTicks
                ))
                .toList();

        List<FoodDto> foodDtos = world.getFoods().stream()
                .map(food -> new FoodDto(
                        food.getId(),
                        food.getX(),
                        food.getY(),
                        food.getEnergy(),
                        calculateFoodRadius(food.getEnergy()),
                        food.isConsumed()
                ))
                .toList();

        return new WorldStateDto(
                world.getTick(),
                config.getWorldWidth(),
                config.getWorldHeight(),
                world.isRunning(),
                saprotrophDtos.size(),
                deadCellDtos.size(),
                foodDtos.size(),
                saprotrophDtos,
                deadCellDtos,
                foodDtos
        );
    }

    private GenomeDto toGenomeDto(Genome genome, double energy) {
        return new GenomeDto(
                genome.getDivisionThreshold(),
                genome.getDivisionImpulseStrength(),
                genome.getColorHue(),
                genome.getLightness(),
                genome.getMaxEnergy(),
                calculateSaprotrophSaturation(energy, genome.getMaxEnergy()),
                GenomeCodeCodec.encode(genome)
        );
    }

    private double calculateSaprotrophRadius(double energy, double divisionThreshold) {
        double energyNorm = Math.min(1.0, energy / divisionThreshold);
        return config.getClientSaprotrophBaseRadius()
                + energyNorm * config.getClientSaprotrophRadiusScale();
    }

    private double calculateFoodRadius(double energy) {
        return config.getClientFoodRadiusAtMinEnergy()
                * Math.sqrt(energy / config.getFoodEnergyMin());
    }

    private double calculateDeadCellRadius(double energy) {
        double denominator = Math.max(0.1, config.getFoodEnergyRange());
        double energyNorm = Math.min(1.0, energy / denominator);
        return config.getClientSaprotrophBaseRadius()
                + energyNorm * config.getClientSaprotrophRadiusScale();
    }

    private double calculateSaprotrophSaturation(double energy, double maxEnergy) {
        if (maxEnergy <= 0.0) {
            return 50.0;
        }

        double energyRatio = Math.max(0.0, Math.min(1.0, energy / maxEnergy));
        return 50.0 + energyRatio * 50.0;
    }
}