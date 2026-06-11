package com.hellengi.biolab.dto.mapper;

public record GenomeValues(
        double divisionThreshold,
        double divisionImpulse,
        double divisionAngle,
        double cytosolArea,
        double cytosolDensity,
        boolean bioluminescenceEnabled,
        double bioluminescence,
        double elasticity,
        boolean melaninEnabled,
        double melaninPercent,
        boolean chloroplastEnabled,
        double chloroplastAmount,
        double chlorophyll,
        double carotenoids,
        boolean lysosomeEnabled,
        double lysosomeAmount,
        double lysosomeEnzymeActivity,
        boolean flagellumEnabled,
        double flagellumCount,
        double flagellumLength,
        double flagellumMotorPower,
        double flagellumPairSpreadAngle,
        double flagellumSteeringAsymmetry
) {
}
