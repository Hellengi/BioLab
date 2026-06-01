package com.hellengi.biolab.domain;

import com.hellengi.biolab.config.YamlConfig;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SimulationClock {
    private static final long MAX_STEPS_PER_POLL = 100L;
    private static final long NANOS_PER_MILLISECOND = 1_000_000L;

    private final YamlConfig baseConfig;

    private long lastStepTimeNs = System.nanoTime();
    private long lastBroadcastTimeMs = 0L;
    private long ticksProcessedInWindow = 0L;
    @Getter
    private long measuredTps = 0L;
    private long tpsWindowStartNs = System.nanoTime();

    StepBatch dueSteps(double speedFactor) {
        long nowNs = System.nanoTime();
        if (speedFactor <= 0.0) {
            lastStepTimeNs = nowNs;
            return StepBatch.none();
        }

        long intervalNs = calculateTickIntervalNs(speedFactor);
        long elapsedNs = nowNs - lastStepTimeNs;
        if (elapsedNs < intervalNs) {
            return StepBatch.none();
        }

        long steps = Math.min(MAX_STEPS_PER_POLL, Math.max(1L, elapsedNs / intervalNs));
        lastStepTimeNs += steps * intervalNs;
        return new StepBatch(steps, calculateTickScale(speedFactor));
    }

    void recordProcessedTick() {
        ticksProcessedInWindow++;
        long nowNs = System.nanoTime();
        long elapsedNs = nowNs - tpsWindowStartNs;
        if (elapsedNs < 1_000_000_000L) {
            return;
        }

        measuredTps = Math.round(ticksProcessedInWindow * 1_000_000_000.0 / elapsedNs);
        ticksProcessedInWindow = 0L;
        tpsWindowStartNs = nowNs;
    }

    boolean isBroadcastDue() {
        long nowMs = System.currentTimeMillis();
        int fps = Math.max(1, baseConfig.getBroadcastFps());
        long intervalMs = Math.max(1L, Math.round(1000.0 / fps));
        if (nowMs - lastBroadcastTimeMs < intervalMs) {
            return false;
        }
        lastBroadcastTimeMs = nowMs;
        return true;
    }

    void resetSimulationStepTimer() {
        lastStepTimeNs = System.nanoTime();
        ticksProcessedInWindow = 0L;
        measuredTps = 0L;
        tpsWindowStartNs = System.nanoTime();
    }

    void reset() {
        lastStepTimeNs = System.nanoTime();
        lastBroadcastTimeMs = 0L;
        ticksProcessedInWindow = 0L;
        measuredTps = 0L;
        tpsWindowStartNs = System.nanoTime();
    }

    private long calculateTickIntervalNs(double speedFactor) {
        if (speedFactor < 1.0 && baseConfig.getTime().isScaleSlowdownInsideTick()) {
            return baseConfig.getTickRateMs() * NANOS_PER_MILLISECOND;
        }
        if (speedFactor > 1.0 && baseConfig.getTime().isScaleSpeedupInsideTick()) {
            return baseConfig.getTickRateMs() * NANOS_PER_MILLISECOND;
        }
        return Math.max(1L, Math.round(baseConfig.getTickRateMs() * NANOS_PER_MILLISECOND / speedFactor));
    }

    private double calculateTickScale(double speedFactor) {
        if (speedFactor < 1.0 && baseConfig.getTime().isScaleSlowdownInsideTick()) {
            return speedFactor;
        }
        if (speedFactor > 1.0 && baseConfig.getTime().isScaleSpeedupInsideTick()) {
            return speedFactor;
        }
        return 1.0;
    }

    static final class StepBatch {
        private final long steps;
        private final double tickScale;

        StepBatch(long steps, double tickScale) {
            this.steps = steps;
            this.tickScale = tickScale;
        }

        long steps() {
            return steps;
        }

        double tickScale() {
            return tickScale;
        }

        static StepBatch none() {
            return new StepBatch(0L, 0.0);
        }
    }
}
