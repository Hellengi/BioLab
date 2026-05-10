package com.hellengi.biolab.model;

import lombok.Setter;
import lombok.Getter;

@Setter
@Getter
public abstract class Particle {
    private final long id;
    private double x, y, vx, vy, energy;
    private long collisionImpulseId = 0L;
    private double collisionImpulse = 0.0;
    private double collisionNormalX = 0.0;
    private double collisionNormalY = 0.0;

    protected Particle(long id, double x, double y,
                       double vx, double vy, double energy) {
        this.id = id;
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.energy = energy;
    }

    public void move(double tickScale) {
        this.x += this.vx * tickScale;
        this.y += this.vy * tickScale;
    }

    public void recordCollisionImpulse(double impulse, double normalX, double normalY) {
        this.collisionImpulseId++;
        this.collisionImpulse = impulse;
        this.collisionNormalX = normalX;
        this.collisionNormalY = normalY;
    }
}
