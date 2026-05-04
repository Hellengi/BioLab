package com.hellengi.biolab.model;

import lombok.Setter;
import lombok.Getter;

@Setter
@Getter
public class DeadCell extends Particle {
    private long lifetimeTicks;

    public DeadCell(long id, double x, double y,
                    double vx, double vy, double energy) {
        this(id, x, y, vx, vy, energy, 0L);
    }

    public DeadCell(long id, double x, double y,
                    double vx, double vy, double energy, long lifetimeTicks) {
        super(id, x, y, vx, vy, energy);
        this.lifetimeTicks = lifetimeTicks;
    }

    public void incrementLifetimeTicks() {
        this.lifetimeTicks++;
    }
}