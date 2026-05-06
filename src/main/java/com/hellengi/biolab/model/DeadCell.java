package com.hellengi.biolab.model;

import lombok.Setter;
import lombok.Getter;

@Setter
@Getter
public class DeadCell extends Particle {
    private double lifetimeTicks;

    public DeadCell(long id, double x, double y,
                    double vx, double vy, double energy) {
        this(id, x, y, vx, vy, energy, 0L);
    }

    public DeadCell(long id, double x, double y,
                    double vx, double vy, double energy, double lifetimeTicks) {
        super(id, x, y, vx, vy, energy);
        this.lifetimeTicks = lifetimeTicks;
    }

    public void addLifetimeTicks(double ticks) {
        this.lifetimeTicks += ticks;
    }
}