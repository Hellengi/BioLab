package com.hellengi.biolab.simulation.physics;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.Particle;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorldPhysics {
    private final YamlConfig config;

    public void move(Particle particle, double radius) {
        move(particle, radius, 1.0);
    }

    public void move(Particle particle, double radius, double stepScale) {
        particle.setX(particle.getX() + particle.getVx() * stepScale);
        particle.setY(particle.getY() + particle.getVy() * stepScale);

        keepInside(particle, radius, true);
    }

    public void keepInside(Particle particle, double radius) {
        keepInside(particle, radius, false);
    }

    private void keepInside(Particle particle, double radius, boolean reflect) {
        if (particle.getX() < radius) {
            particle.setX(radius);
            if (reflect) particle.setVx(-particle.getVx());
        } else if (particle.getX() > config.getWidth() - radius) {
            particle.setX(config.getWidth() - radius);
            if (reflect) particle.setVx(-particle.getVx());
        }

        if (particle.getY() < radius) {
            particle.setY(radius);
            if (reflect) particle.setVy(-particle.getVy());
        } else if (particle.getY() > config.getHeight() - radius) {
            particle.setY(config.getHeight() - radius);
            if (reflect) particle.setVy(-particle.getVy());
        }
    }

    public void applyViscosity(Particle particle, double tickScale) {
        double viscosity = Math.pow(config.getCell().getViscosity(), tickScale);
        particle.setVx(particle.getVx() * viscosity);
        particle.setVy(particle.getVy() * viscosity);
    }

    public void applyViscosity(Particle particle) {
        applyViscosity(particle, 1.0);
    }

    public double clampX(double x) {
        return Math.max(0.0, Math.min(config.getWidth(), x));
    }

    public double clampY(double y) {
        return Math.max(0.0, Math.min(config.getHeight(), y));
    }
}