package com.hellengi.biolab.dto;

public record CellEventDto(
        String type,
        Double time,
        double duration,

        Double impulse,
        Double normalX,
        Double normalY
) {
}