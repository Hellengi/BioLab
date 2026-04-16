package com.hellengi.biolab.model;

public class Food {

    private final long id;
    private final double x;
    private final double y;
    private double energy;
    private boolean consumed = false;

    public Food(long id, double x, double y, double energy) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.energy = energy;
    }

    public long getId() {
        return id;
    }

    public double getX() {
        return x;
    }

    public double getY() {
        return y;
    }

    public double getEnergy() {
        return energy;
    }

    public boolean isConsumed() {
        return consumed;
    }

    public void setConsumed(boolean consumed) {
        this.consumed = consumed;
    }

    public void setEnergy(double energy) {
        this.energy = energy;
    }
}
