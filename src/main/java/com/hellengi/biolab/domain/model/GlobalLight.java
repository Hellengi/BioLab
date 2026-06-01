package com.hellengi.biolab.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GlobalLight {
    private double value = 0.0;
    private double cycleTick = 0.0;

    private double staticValue = 0.0;
    private boolean cycleEnabled = false;
    private double cycleMin = 0.0;
    private double cyclePeriodSeconds = 0.0;

    public void incrementTick(double tickScale) {
        if (cycleEnabled) {
            cycleTick += tickScale;
        }
    }

    public void resetTick() {
        cycleTick = 0.0;
    }

    public void set(
            double staticValue,
            boolean cycleEnabled,
            double cycleMin,
            double cyclePeriodSeconds
    ) {
        this.staticValue = staticValue;
        this.cycleEnabled = cycleEnabled;
        this.cycleMin = Math.min(cycleMin, this.staticValue);
        this.cyclePeriodSeconds = cyclePeriodSeconds;
    }

    public void update(long tickRateMs) {
        if (!cycleEnabled || cyclePeriodSeconds <= 0.0) {
            value = staticValue;
            return;
        }

        double ticksPerSecond = 1000.0 / Math.max(1.0, tickRateMs);
        double periodTicks = Math.max(1.0, cyclePeriodSeconds * ticksPerSecond);
        double phase = (Math.max(0.0, cycleTick) % periodTicks) / periodTicks;
        double wave = (Math.sin(phase * Math.PI * 2.0 - Math.PI / 2.0) + 1.0) / 2.0;

        value = cycleMin + (staticValue - cycleMin) * wave;
    }

    public void clear() {
        value = 0.0;
        cycleTick = 0.0;
        staticValue = 0.0;
        cycleEnabled = false;
        cycleMin = 0.0;
        cyclePeriodSeconds = 0.0;
    }
}