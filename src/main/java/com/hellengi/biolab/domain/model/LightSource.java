package com.hellengi.biolab.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LightSource {
    private double orbitRadius;
    private double orbitSpeed;
    private double brightness;
    private double angle;

    public LightSource(double orbitRadius, double orbitSpeed, double brightness, double angle) {
        this.orbitRadius = orbitRadius;
        this.orbitSpeed = orbitSpeed;
        this.brightness = brightness;
        this.angle = angle;
    }

    public void updateAngle(double tickScale) {
        this.angle = (this.angle + orbitSpeed * tickScale) % (2 * Math.PI);
    }

    public double getX(double centerX) {
        return centerX + Math.cos(angle) * orbitRadius;
    }

    public double getY(double centerY) {
        return centerY + Math.sin(angle) * orbitRadius;
    }
}