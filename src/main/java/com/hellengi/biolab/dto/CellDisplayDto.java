package com.hellengi.biolab.dto;

public record CellDisplayDto(
        Double lightDirectionAngle,
        Double lightGradient,
        Double highlightDirectionAngle,
        Double highlightStrength,
        Double highlightClarity
) {
}
