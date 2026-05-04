package com.hellengi.biolab.model;

import lombok.Setter;
import lombok.Getter;

@Setter
@Getter
public abstract class Particle {
    private final long id;
    private double x, y, vx, vy, energy;

    protected Particle(long id, double x, double y,
                       double vx, double vy, double energy) {
        this.id = id;
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.energy = energy;
    }

    public void move() {
        this.x += this.vx;
        this.y += this.vy;
    }
}
