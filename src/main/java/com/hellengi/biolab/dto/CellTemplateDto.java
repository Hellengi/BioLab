package com.hellengi.biolab.dto;

public record CellTemplateDto(
        Long id,
        String name,
        String code,
        double divisionThreshold,
        double divisionImpulseStrength,
        double colorHue,
        double lightness,
        double maxEnergy
) {
}