package com.hellengi.biolab.dto;

public record GenomeDto(
        double divisionThreshold,
        double divisionImpulse,
        double divisionAngle,
        Double cytosolArea,
        Double cytosolDensity,
        boolean gfpEnabled,
        Double gfp,
        Double elasticity,
        boolean melaninEnabled,
        Double melaninPercent,
        boolean chloroplastEnabled,
        Double chloroplastAmount,
        Double chlorophyll,
        Double carotenoids,
        boolean lysosomeEnabled,
        Double lysosomeAmount,
        Double lysosomeEnzymeActivity,
        boolean flagellumEnabled,
        Double flagellumCount,
        Double flagellumLength,
        Double flagellumMotorPower,
        Double flagellumPairSpreadAngle,
        Double flagellumSteeringAsymmetry,
        String code
) {
}
