package com.hellengi.biolab.dto;

public record LightSourceDto(
        double x,
        double y,
        double brightness,
        double orbitRadius,
        double orbitSpeed,
        double angle,
        String renderType
) {
}