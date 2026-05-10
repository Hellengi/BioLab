package com.hellengi.biolab.model;

import lombok.Setter;
import lombok.Getter;

@Setter
@Getter
public class DeadCell extends Particle {
    private double lifetimeTicks;
    private double mass;

    public DeadCell(long id, double x, double y,
                    double vx, double vy, double energy, double mass) {
        this(id, x, y, vx, vy, energy, mass, 0L);
    }

    public DeadCell(long id, double x, double y,
                    double vx, double vy, double energy, double mass, double lifetimeTicks) {
        super(id, x, y, vx, vy, energy);
        this.mass = mass;
        this.lifetimeTicks = lifetimeTicks;
    }

    public void addLifetimeTicks(double ticks) {
        this.lifetimeTicks += ticks;
    }
}