package com.hellengi.biolab.dto;

public record GenomeDto(
        double divisionThreshold,
        double divisionImpulseStrength,
        double colorHue,
        double lightness,
        double maxEnergy,
        double saturation,
        String code
) {
}