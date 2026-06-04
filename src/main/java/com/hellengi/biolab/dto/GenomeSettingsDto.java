package com.hellengi.biolab.dto;

public record GenomeSettingsDto(
        RangedValueDto divisionThreshold,
        RangedValueDto divisionImpulse,
        RangedValueDto divisionAngle,
        RangedValueDto startCellDamage,
        RangedValueDto maxEnergy,
        RangedValueDto dryMass,
        RangedValueDto elasticity,
        RangedValueDto gfp,
        boolean melaninEnabled,
        RangedValueDto melaninPercent,
        boolean chloroplastEnabled,
        RangedValueDto chloroplastAmount,
        RangedValueDto chlorophyll,
        RangedValueDto carotenoids,
        RangedValueDto startCpDamage,
        boolean lysosomeEnabled,
        RangedValueDto lysosomeAmount,
        RangedValueDto lysosomeEnzymeActivity,
        String code
) {
}
