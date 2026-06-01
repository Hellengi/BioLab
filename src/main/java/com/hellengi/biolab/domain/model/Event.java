package com.hellengi.biolab.domain.model;

public interface Event {
    String type();

    Double getTime();
    void setTime(Double time);
    double getDuration();
    default boolean hasTime() {
        return getTime() != null;
    }

    default boolean isExpired(double currentSeconds) {
        return getTime() != null
                && getDuration() > 0.0
                && currentSeconds - getTime() >= getDuration();
    }
}