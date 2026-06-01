package com.hellengi.biolab.dto;

public record StrainDto(
        Long id,
        String name,
        GenomeDto genome
) {
}