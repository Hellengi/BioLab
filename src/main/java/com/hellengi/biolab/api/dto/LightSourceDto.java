package com.hellengi.biolab.api.dto;

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