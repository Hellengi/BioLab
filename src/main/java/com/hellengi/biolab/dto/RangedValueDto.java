package com.hellengi.biolab.dto;

public record RangedValueDto(
        double value,
        double min,
        double max,
        double step,
        double initial
) {
}