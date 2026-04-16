package com.hellengi.biolab.dto;

public record SaveCellTemplateRequestDto(
        String name,
        CellTemplateDto cell
) {
}