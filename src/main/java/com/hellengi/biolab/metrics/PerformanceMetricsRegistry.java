package com.hellengi.biolab.metrics;

import org.springframework.stereotype.Component;

import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.DoubleAccumulator;
import java.util.concurrent.atomic.DoubleAdder;
import java.util.concurrent.atomic.LongAdder;

/**
 * Generic, name-based metrics registry for the realtime simulation hot paths.
 *
 * New organelles, physics stages, render layers or transport lanes do not need
 * schema changes: call recordDuration/recordBytes/incrementCounter/setGauge with
 * a stable dotted name and it appears automatically in the snapshot endpoint.
 */
@Component
public class PerformanceMetricsRegistry {
    public static final String SERVER_TICK_TIME = "server.tick.time";
    public static final String SERVER_WORLD_LOCK_WAIT = "server.worldLock.wait";
    public static final String SERVER_WORLD_LOCK_HOLD = "server.worldLock.hold";
    public static final String SERVER_SNAPSHOT_COPY = "server.snapshot.copy";
    public static final String SERVER_RENDER_ENCODE = "server.render.encode";
    public static final String SERVER_WEBSOCKET_SEND = "server.websocket.send";
    public static final String SERVER_PAYLOAD_BYTES = "server.payload.bytes";
    public static final String SERVER_DROPPED_FRAMES = "server.websocket.droppedFrames";
    public static final String CLIENT_FPS = "client.fps";
    public static final String CLIENT_DECODE = "client.decode";
    public static final String CLIENT_DRAW = "client.draw";

    private final long createdAtNanos = System.nanoTime();
    private final Instant createdAt = Instant.now();
    private final Map<String, SummaryAccumulator> durations = new ConcurrentHashMap<>();
    private final Map<String, SummaryAccumulator> bytes = new ConcurrentHashMap<>();
    private final Map<String, LongAdder> counters = new ConcurrentHashMap<>();
    private final Map<String, Double> gauges = new ConcurrentHashMap<>();
    private final List<GarbageCollectorMXBean> gcBeans = ManagementFactory.getGarbageCollectorMXBeans();

    private volatile long lastGcSampleNanos = System.nanoTime();
    private volatile long lastHeapUsedBytes = currentHeapUsedBytes();
    private volatile long lastGcCount = currentGcCollectionCount();
    private volatile long lastGcTimeMs = currentGcCollectionTimeMs();

    public void recordDuration(String name, long nanos) {
        if (name == null || name.isBlank() || nanos < 0L) {
            return;
        }
        durations.computeIfAbsent(name, ignored -> new SummaryAccumulator()).record(nanos / 1_000_000.0);
    }

    public void recordDuration(String name, long startNanos, long endNanos) {
        recordDuration(name, Math.max(0L, endNanos - startNanos));
    }

    public void recordBytes(String name, long value) {
        if (name == null || name.isBlank() || value < 0L) {
            return;
        }
        bytes.computeIfAbsent(name, ignored -> new SummaryAccumulator()).record(value);
    }

    public void incrementCounter(String name) {
        incrementCounter(name, 1L);
    }

    public void incrementCounter(String name, long delta) {
        if (name == null || name.isBlank() || delta == 0L) {
            return;
        }
        counters.computeIfAbsent(name, ignored -> new LongAdder()).add(delta);
    }

    public void setGauge(String name, double value) {
        if (name == null || name.isBlank() || !Double.isFinite(value)) {
            return;
        }
        gauges.put(name, value);
    }

    public void recordClientMetrics(String sessionId, Map<?, ?> payload) {
        if (payload == null) {
            return;
        }
        String prefix = sessionId == null || sessionId.isBlank()
                ? "client.unknown"
                : "client." + sessionId;

        recordClientSummary(CLIENT_DECODE, payload.get("decodeTimeMs"));
        recordClientSummary(CLIENT_DRAW, payload.get("drawTimeMs"));
        recordClientSummary("client.inboundPayload.bytes", payload.get("inboundPayloadBytes"));

        Double fps = number(payload.get("fps"));
        if (fps != null) {
            setGauge(prefix + ".fps", fps);
            setGauge(CLIENT_FPS, fps);
        }

        Double dropped = number(payload.get("droppedFrames"));
        if (dropped != null) {
            setGauge(prefix + ".droppedFrames", dropped);
        }
    }

    public PerformanceMetricsSnapshotDto snapshot() {
        sampleGcAndMemory();
        return new PerformanceMetricsSnapshotDto(
                Instant.now(),
                Duration.between(createdAt, Instant.now()).toMillis(),
                snapshotSummaries(durations, "ms"),
                snapshotSummaries(bytes, "bytes"),
                snapshotCounters(),
                snapshotGauges()
        );
    }

    public void reset() {
        durations.clear();
        bytes.clear();
        counters.clear();
        gauges.clear();
        lastGcSampleNanos = System.nanoTime();
        lastHeapUsedBytes = currentHeapUsedBytes();
        lastGcCount = currentGcCollectionCount();
        lastGcTimeMs = currentGcCollectionTimeMs();
    }

    private void recordClientSummary(String name, Object value) {
        if (value instanceof Map<?, ?> map) {
            Double avg = number(map.get("avg"));
            Double count = number(map.get("count"));
            if (avg == null || count == null || count <= 0.0) {
                return;
            }
            int samples = Math.max(1, (int) Math.round(count));
            SummaryAccumulator accumulator = durations.computeIfAbsent(name, ignored -> new SummaryAccumulator());
            for (int i = 0; i < samples; i++) {
                accumulator.record(avg);
            }
            Double max = number(map.get("max"));
            if (max != null && max > avg) {
                accumulator.record(max);
            }
            return;
        }

        Double number = number(value);
        if (number == null) {
            return;
        }
        if (name.endsWith(".bytes")) {
            recordBytes(name, Math.max(0L, Math.round(number)));
        } else {
            durations.computeIfAbsent(name, ignored -> new SummaryAccumulator()).record(number);
        }
    }

    private Map<String, MetricSummaryDto> snapshotSummaries(Map<String, SummaryAccumulator> source, String unit) {
        Map<String, MetricSummaryDto> result = new LinkedHashMap<>();
        source.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> result.put(entry.getKey(), entry.getValue().snapshot(unit)));
        return result;
    }

    private Map<String, Long> snapshotCounters() {
        Map<String, Long> result = new LinkedHashMap<>();
        counters.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> result.put(entry.getKey(), entry.getValue().sum()));
        return result;
    }

    private Map<String, Double> snapshotGauges() {
        Map<String, Double> result = new LinkedHashMap<>();
        gauges.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> result.put(entry.getKey(), entry.getValue()));
        return result;
    }

    private synchronized void sampleGcAndMemory() {
        long now = System.nanoTime();
        long elapsedNanos = Math.max(1L, now - lastGcSampleNanos);
        double elapsedSeconds = elapsedNanos / 1_000_000_000.0;

        long heapUsedBytes = currentHeapUsedBytes();
        long gcCount = currentGcCollectionCount();
        long gcTimeMs = currentGcCollectionTimeMs();

        long heapIncrease = Math.max(0L, heapUsedBytes - lastHeapUsedBytes);
        setGauge("server.gc.heapUsed.bytes", heapUsedBytes);
        setGauge("server.gc.heapAllocationRateApprox.bytesPerSec", heapIncrease / elapsedSeconds);
        setGauge("server.gc.collections.delta", Math.max(0L, gcCount - lastGcCount));
        setGauge("server.gc.collectionTime.deltaMs", Math.max(0L, gcTimeMs - lastGcTimeMs));
        setGauge("server.metrics.uptime.ms", (System.nanoTime() - createdAtNanos) / 1_000_000.0);

        lastGcSampleNanos = now;
        lastHeapUsedBytes = heapUsedBytes;
        lastGcCount = gcCount;
        lastGcTimeMs = gcTimeMs;
    }

    private long currentHeapUsedBytes() {
        Runtime runtime = Runtime.getRuntime();
        return runtime.totalMemory() - runtime.freeMemory();
    }

    private long currentGcCollectionCount() {
        long total = 0L;
        for (GarbageCollectorMXBean bean : gcBeans) {
            long value = bean.getCollectionCount();
            if (value > 0L) {
                total += value;
            }
        }
        return total;
    }

    private long currentGcCollectionTimeMs() {
        long total = 0L;
        for (GarbageCollectorMXBean bean : gcBeans) {
            long value = bean.getCollectionTime();
            if (value > 0L) {
                total += value;
            }
        }
        return total;
    }

    private Double number(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Double.parseDouble(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private static final class SummaryAccumulator {
        private final LongAdder count = new LongAdder();
        private final DoubleAdder total = new DoubleAdder();
        private final DoubleAccumulator min = new DoubleAccumulator(Math::min, Double.POSITIVE_INFINITY);
        private final DoubleAccumulator max = new DoubleAccumulator(Math::max, Double.NEGATIVE_INFINITY);

        void record(double value) {
            if (!Double.isFinite(value)) {
                return;
            }
            count.increment();
            total.add(value);
            min.accumulate(value);
            max.accumulate(value);
        }

        MetricSummaryDto snapshot(String unit) {
            long c = count.sum();
            if (c <= 0L) {
                return MetricSummaryDto.empty(unit);
            }
            double t = total.sum();
            return new MetricSummaryDto(c, t, t / c, min.get(), max.get(), unit);
        }
    }
}
