package com.hellengi.biolab.dto;

public record GenomeDto(
        double divisionThreshold,
        double divisionImpulse,
        double divisionAngle,
        double maxEnergy,
        Double dryMass,
        Double elasticity,
        Double gfp,
        boolean melaninEnabled,
        Double melaninPercent,
        boolean chloroplastEnabled,
        Double chloroplastAmount,
        Double chlorophyll,
        Double carotenoids,
        boolean lysosomeEnabled,
        Double lysosomeAmount,
        Double lysosomeEnzymeActivity,
        String code
) {
}
