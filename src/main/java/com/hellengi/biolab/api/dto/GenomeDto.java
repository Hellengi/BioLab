package com.hellengi.biolab.api.dto;

public record GenomeDto(
        double divisionThreshold,
        double divisionImpulseStrength,
        double colorHue,
        double saturation,
        double lightness,
        double maxEnergy,
        String code
) {
}