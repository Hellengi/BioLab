package com.hellengi.biolab.model;

import lombok.Setter;
import lombok.Getter;

@Setter
@Getter
public class Cell extends Particle {
    private Genome genome;
    private double directionAngle = 0.0;
    private boolean markedForRemoval = false;

    public Cell(long id, double x, double y,
                double vx, double vy, double energy, Genome genome) {
        super(id, x, y, vx, vy, energy);
        this.genome = genome;
    }
}