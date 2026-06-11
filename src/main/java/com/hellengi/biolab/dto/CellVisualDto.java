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
        RgbColorDto flagellumColor,
        int flagellumCount,
        RgbColorDto bioluminescenceColor,
        double bioluminescenceExpression,
        Double lightDirectionAngle,
        Double lightGradient,
        Double highlightDirectionAngle,
        Double highlightStrength,
        Double highlightClarity
) {
}
