package com.hellengi.biolab.model;

public abstract class Cell {

    private long id;
    private double x;
    private double y;
    private double vx;
    private double vy;
    private double energy;
    private boolean alive;

    protected Cell(long id, double x, double y, double vx, double vy, double energy, boolean alive) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.energy = energy;
        this.alive = alive;
    }

    public void move() {
        this.x += this.vx;
        this.y += this.vy;
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

    public double getVx() {
        return vx;
    }

    public double getVy() {
        return vy;
    }

    public double getEnergy() {
        return energy;
    }

    public boolean isAlive() {
        return alive;
    }

    public void setX(double x) {
        this.x = x;
    }

    public void setY(double y) {
        this.y = y;
    }

    public void setVx(double vx) {
        this.vx = vx;
    }

    public void setVy(double vy) {
        this.vy = vy;
    }

    public void setEnergy(double energy) {
        this.energy = energy;
    }

    public void setAlive(boolean alive) {
        this.alive = alive;
    }
}
