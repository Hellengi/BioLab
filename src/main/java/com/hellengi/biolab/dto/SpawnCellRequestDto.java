package com.hellengi.biolab.dto;

public record SpawnCellRequestDto(
        double x,
        double y,
        GenomeDto genome,
        double initialSpeed,
        double initialDirection
) {
}