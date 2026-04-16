package com.hellengi.biolab.dto;

public record SaprotrophDto(
        long id,
        double x,
        double y,
        double vx,
        double vy,
        double energy,
        GenomeDto genome,
        double radius,
        boolean alive
) {
}