package com.hellengi.biolab.api.dto;

public record GenomeDto(
        double divisionThreshold,
        double divisionImpulse,
        double divisionAngle,
        double colorHue,
        double saturation,
        double lightness,
        double maxEnergy,
        Double dryMass,
        Double elasticity,
        String code
) {
}