package com.hellengi.biolab.api.dto;

public record GenomeSettingsDto(
        RangedValueDto divisionThreshold,
        RangedValueDto divisionImpulse,
        RangedValueDto divisionAngle,
        RangedValueDto colorHue,
        RangedValueDto saturation,
        RangedValueDto lightness,
        RangedValueDto maxEnergy,
        RangedValueDto dryMass,
        RangedValueDto elasticity,
        String code
) {
}