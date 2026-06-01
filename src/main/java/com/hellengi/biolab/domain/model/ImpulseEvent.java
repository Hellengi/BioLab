package com.hellengi.biolab.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
public class ImpulseEvent implements Event {
    public static final String TYPE = "impulse";
    public static final double DURATION_SECONDS = 1.0;

    @Setter
    private Double time;
    private final double duration;

    private final double impulse;
    private final double normalX;
    private final double normalY;

    public ImpulseEvent(
            Double time,
            double duration,
            double impulse,
            double normalX,
            double normalY
    ) {
        this.time = time;
        this.duration = duration;
        this.impulse = impulse;
        this.normalX = normalX;
        this.normalY = normalY;
    }

    public static ImpulseEvent create(
            double impulse,
            double normalX,
            double normalY
    ) {
        return new ImpulseEvent(
                null,
                DURATION_SECONDS,
                impulse,
                normalX,
                normalY
        );
    }

    @Override
    public String type() {
        return TYPE;
    }
}