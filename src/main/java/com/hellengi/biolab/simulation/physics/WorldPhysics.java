package com.hellengi.biolab.simulation.physics;

import com.hellengi.biolab.config.SimulationProperties;
import com.hellengi.biolab.model.Particle;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorldPhysics {
    private final SimulationProperties config;

    public void move(Particle particle) {
        particle.move();

        if (particle.getX() < 0.0) {
            particle.setX(0.0);
            particle.setVx(-particle.getVx());
        } else if (particle.getX() > config.getWidth()) {
            particle.setX(config.getWidth());
            particle.setVx(-particle.getVx());
        }

        if (particle.getY() < 0.0) {
            particle.setY(0.0);
            particle.setVy(-particle.getVy());
        } else if (particle.getY() > config.getHeight()) {
            particle.setY(config.getHeight());
            particle.setVy(-particle.getVy());
        }
    }

    public void applyViscosity(Particle particle) {
        double viscosityFactor = Math.max(0.0, Math.min(1.0, config.getCell().getViscosity()));

        particle.setVx(particle.getVx() * viscosityFactor);
        particle.setVy(particle.getVy() * viscosityFactor);

        if (Math.abs(particle.getVx()) < 0.001) {
            particle.setVx(0.0);
        }

        if (Math.abs(particle.getVy()) < 0.001) {
            particle.setVy(0.0);
        }
    }

    public double clampX(double x) {
        return Math.max(0.0, Math.min(config.getWidth(), x));
    }

    public double clampY(double y) {
        return Math.max(0.0, Math.min(config.getHeight(), y));
    }
}