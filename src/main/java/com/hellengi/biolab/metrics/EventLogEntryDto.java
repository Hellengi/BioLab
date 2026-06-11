package com.hellengi.biolab.metrics;

import java.util.Map;

public record EventLogEntryDto(
        String id,
        String type,
        String title,
        String body,
        String tone,
        String icon,
        String createdAt,
        Map<String, Object> payload
) {
}
