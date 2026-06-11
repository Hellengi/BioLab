package com.hellengi.biolab.metrics;

public record MetricSummaryDto(
        long count,
        double total,
        double avg,
        double min,
        double max,
        String unit
) {
    public static MetricSummaryDto empty(String unit) {
        return new MetricSummaryDto(0L, 0.0, 0.0, 0.0, 0.0, unit);
    }
}
