package com.hellengi.biolab.api.dto;

public record CellDto(
        long id,
        double x,
        double y,
        double vx,
        double vy,
        double energy,
        double radius,
        boolean dead,
        GenomeDto genome,
        long lifetimeTicks,
        long maxLifetimeTicks,
        double localLight,
        double mass,
        double density,
        CellMotionDto motion,
        double directionAngle
) {
}