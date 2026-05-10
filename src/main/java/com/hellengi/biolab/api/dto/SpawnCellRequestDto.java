package com.hellengi.biolab.api.dto;

public record SpawnCellRequestDto(
        double x,
        double y,
        GenomeDto genome,
        double initialSpeed,
        double initialDirection
) {
}