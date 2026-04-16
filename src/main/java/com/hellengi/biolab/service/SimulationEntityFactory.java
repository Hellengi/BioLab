package com.hellengi.biolab.service;

import com.hellengi.biolab.config.SimulationProperties;
import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Food;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.model.Saprotroph;
import com.hellengi.biolab.util.IdGenerator;
import org.springframework.stereotype.Component;

import java.util.Random;

@Component
public class SimulationEntityFactory {

    private final SimulationProperties config;
    private final Random random = new Random();

    public SimulationEntityFactory(SimulationProperties config) {
        this.config = config;
    }

    public Saprotroph createRandomSaprotroph(double centerX, double centerY) {
        double angle = random.nextDouble() * Math.PI * 2.0;
        double vx = Math.cos(angle) * config.getGenome().getInitialDivisionImpulseStrength();
        double vy = Math.sin(angle) * config.getGenome().getInitialDivisionImpulseStrength();

        double initialEnergy = config.getInitialSaprotrophEnergyMin()
                + random.nextDouble() * config.getInitialSaprotrophEnergyRange();

        double x = centerX + randomOffset(config.getInitialSpawnOffsetRange());
        double y = centerY + randomOffset(config.getInitialSpawnOffsetRange());

        Genome genome = new Genome(
                config.getGenome().getInitialDivisionThreshold(),
                config.getGenome().getInitialDivisionImpulseStrength(),
                config.getGenome().getInitialColorHue(),
                config.getGenome().getInitialLightness(),
                config.getGenome().getInitialMaxEnergy()
        );

        initialEnergy = Math.min(initialEnergy, genome.getMaxEnergy());

        return new Saprotroph(
                IdGenerator.nextId(),
                x,
                y,
                vx,
                vy,
                initialEnergy,
                genome
        );
    }

    public Food createRandomFood() {
        double x = random.nextDouble() * config.getWorldWidth();
        double y = random.nextDouble() * config.getWorldHeight();
        double energy = config.getFoodEnergyMin()
                + random.nextDouble() * config.getFoodEnergyRange();

        return new Food(IdGenerator.nextId(), x, y, energy);
    }

    public Food createFoodAtPosition(double x, double y, double energy) {
        return new Food(
                IdGenerator.nextId(),
                x,
                y,
                Math.max(config.getFoodEnergyMin(), energy)
        );
    }

    public DeadCell createDeadCellFromSaprotroph(Saprotroph saprotroph) {
        return new DeadCell(
                IdGenerator.nextId(),
                saprotroph.getX(),
                saprotroph.getY(),
                saprotroph.getVx(),
                saprotroph.getVy(),
                saprotroph.getEnergy()
        );
    }

    private double randomOffset(double halfRange) {
        return random.nextDouble() * 2.0 * halfRange - halfRange;
    }
}