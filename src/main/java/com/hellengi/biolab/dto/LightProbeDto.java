package com.hellengi.biolab.dto;

public record LightProbeDto(
        double x,
        double y,
        double light,
        long tick,
        double time
) {
}
