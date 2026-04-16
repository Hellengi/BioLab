package com.hellengi.biolab.dto;

public record DeadCellDto(
        long id,
        double x,
        double y,
        double vx,
        double vy,
        double energy,
        double radius,
        long lifetimeTicks,
        long maxLifetimeTicks
) {
}