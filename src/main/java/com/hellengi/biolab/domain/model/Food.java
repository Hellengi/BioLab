package com.hellengi.biolab.domain.model;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.util.IdGenerator;
import lombok.Setter;
import lombok.Getter;

@Getter
public class Food {
    private final long id;

    private final YamlConfig config;

    private double x;
    private double y;
    @Setter
    private double energy;
    @Setter
    private boolean markedForRemoval = false;

    public Food(long id, YamlConfig config) {
        this.id = id;
        this.config = config;
        IdGenerator.advanceBeyond(id);
    }

    public Food(YamlConfig config) {
        this.id = IdGenerator.nextId();
        this.config = config;
    }

    public void setPosition(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public double getRadius() {
        double minEnergy = Math.max(0.1, config.getFood().getMinEnergy());
        return config.getFood().getBaseRadius() * Math.sqrt(Math.max(0.0, energy / minEnergy));
    }
}
