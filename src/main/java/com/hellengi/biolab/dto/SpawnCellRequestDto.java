package com.hellengi.biolab.dto;

public record SpawnCellRequestDto(
        double x,
        double y,
        double initialDirection,
        double initialSpeed,
        Double startNucleusDamage,
        Double startCytosolDamage,
        Double startCpDamage,
        Double startMembraneDamage,
        Double startLysosomeDamage,
        Double startFlagellumDamage,
        GenomeDto genome
) {
}
