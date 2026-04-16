package com.hellengi.biolab.model;

public class DeadCell extends Cell {

    private long lifetimeTicks;

    public DeadCell(
            long id,
            double x,
            double y,
            double vx,
            double vy,
            double energy
    ) {
        this(id, x, y, vx, vy, energy, 0L);
    }

    public DeadCell(
            long id,
            double x,
            double y,
            double vx,
            double vy,
            double energy,
            long lifetimeTicks
    ) {
        super(id, x, y, vx, vy, energy, false);
        this.lifetimeTicks = lifetimeTicks;
    }

    public long getLifetimeTicks() {
        return lifetimeTicks;
    }

    public void setLifetimeTicks(long lifetimeTicks) {
        this.lifetimeTicks = lifetimeTicks;
    }

    public void incrementLifetimeTicks() {
        this.lifetimeTicks++;
    }
}