package com.hellengi.biolab.metrics;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.Map;

public record PerformanceMetricsSnapshotDto(
        Instant timestamp,
        long uptimeMs,
        Map<String, MetricSummaryDto> durations,
        Map<String, MetricSummaryDto> bytes,
        Map<String, Long> counters,
        Map<String, Double> gauges
) {
    @JsonProperty("type")
    public String type() {
        return "performanceMetrics";
    }
}
