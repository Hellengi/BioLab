package com.hellengi.biolab.model;

import lombok.Setter;
import lombok.Getter;

@Getter
public class Food {
    private final long id;
    private final double x;
    private final double y;
    @Setter
    private double energy;
    @Setter
    private boolean consumed = false;

    public Food(long id, double x, double y, double energy) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.energy = energy;
    }
}
