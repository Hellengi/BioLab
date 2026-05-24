package com.hellengi.biolab.domain.model;

import com.hellengi.biolab.config.YamlConfig;
import static com.hellengi.biolab.util.Utils.*;

import com.hellengi.biolab.util.IdGenerator;
import lombok.Setter;
import lombok.Getter;

@Setter
@Getter
public class Cell {
    private final long id;

    private final YamlConfig config;

    private double x = 0;
    private double y = 0;

    private double vx = 0;
    private double vy = 0;

    private double energy = 0;

    private long collisionImpulseId = 0L;
    private double collisionImpulse = 0.0;
    private double collisionNormalX = 0.0;
    private double collisionNormalY = 0.0;

    private Genome genome;

    private double directionAngle = 0.0;

    private boolean markedForRemoval = false;

    private boolean alive = true;

    private double lifetimeTicks = 0.0;

    private double mass = EPSILON;

    public Cell(long id, YamlConfig config) {
        this.id = id;
        this.config = config;
    }

    public Cell(YamlConfig config) {
        this.id = IdGenerator.nextId();
        this.config = config;
    }

    public void move(double tickScale) {
        this.x += this.vx * tickScale;
        this.y += this.vy * tickScale;
    }

    public void addLifetimeTicks(double ticks) {
        this.lifetimeTicks += ticks;
    }

    public void recordCollisionImpulse(
            double impulse,
            double normalX,
            double normalY
    ) {
        this.collisionImpulseId++;
        this.collisionImpulse = impulse;
        this.collisionNormalX = normalX;
        this.collisionNormalY = normalY;
    }

    public void setPosition(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public void setVelocity(double vx, double vy) {
        this.vx = vx;
        this.vy = vy;
    }

    public void setMass() {
        mass = getMass();
    }

    public double getMass() {
        if (isAlive()) {
            return getGenome().getDryMass()
                    + getEnergy() * config.getCell().getEnergyToMassFactor();
        }
        else return mass;
    }

    public double getDensity() {
        double area = Math.PI * getRadius() * getRadius();
        return getMass() / avoidZero(area);
    }

    public double getRadius() {
        double divisionThreshold = getGenome().getDivisionThreshold();
        double safeThreshold = Math.max(0.1, divisionThreshold);
        double energyNorm = Math.max(0.0, Math.min(1.0, energy / safeThreshold));
        return config.getCell().getBaseRadius()
                + energyNorm * config.getCell().getEnergyToRadiusFactor();
    }
}