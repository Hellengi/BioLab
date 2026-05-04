package com.hellengi.biolab.api.dto;

public record CellTemplateDto(
        Long id,
        String name,
        GenomeDto genome
) {
}