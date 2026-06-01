package com.hellengi.biolab.domain.model;

import com.hellengi.biolab.config.YamlConfig;
import static com.hellengi.biolab.util.Utils.*;

import com.hellengi.biolab.util.IdGenerator;
import lombok.Setter;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

@Setter
@Getter
public class Cell {
    public static final double CELL_OPACITY = 0.1;

    private final long id;

    private final YamlConfig config;

    private double x = 0;
    private double y = 0;

    private double vx = 0;
    private double vy = 0;

    private double directionAngle = 0.0;

    private double energy = 0;

    private Genome genome;

    private final List<Event> events = new ArrayList<>();

    private boolean markedForRemoval = false;

    private boolean alive = true;

    private double lifetimeTicks = 0.0;

    private double mass = EPSILON;

    public Cell(long id, YamlConfig config) {
        this.id = id;
        this.config = config;
        IdGenerator.advanceBeyond(id);
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

    public double getOpacity() {
        return CELL_OPACITY;
    }

    public void addEvent(Event event) {
        events.add(event);
    }

    public void setEvents(List<Event> events) {
        this.events.clear();

        if (events != null) {
            this.events.addAll(events);
        }
    }

    public void assignMissingEventTimes(double time) {
        for (Event event : events) {
            if (!event.hasTime()) {
                event.setTime(time);
            }
        }
    }

    public void removeExpiredEvents(double time) {
        events.removeIf(event -> event.isExpired(time));
    }
}