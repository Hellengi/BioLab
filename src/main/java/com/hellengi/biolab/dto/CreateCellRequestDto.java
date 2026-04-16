package com.hellengi.biolab.dto;

public record CreateCellRequestDto(
        double x,
        double y,
        CellTemplateDto cell
) {
}