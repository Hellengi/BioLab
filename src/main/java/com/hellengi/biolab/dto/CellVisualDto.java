package com.hellengi.biolab.dto;

public record CellVisualDto(
        RgbColorDto cellColor,
        RgbColorDto membraneColor,
        RgbColorDto nucleoidColor,
        RgbColorDto cytosolColor,
        RgbColorDto chloroplastColor,
        int chloroplastAmount,
        RgbColorDto lysosomeColor,
        int lysosomeAmount,
        RgbColorDto lysosomeGlowColor,
        double lysosomeGlowStrength,
        RgbColorDto gfpColor,
        double gfpExpression,
        Double lightDirectionAngle,
        Double lightGradient,
        Double highlightDirectionAngle,
        Double highlightStrength,
        Double highlightClarity
) {
}
