package com.hellengi.biolab.metrics;

import java.util.Map;

public record EventLogAppendRequestDto(
        String type,
        String title,
        String body,
        String tone,
        String icon,
        Map<String, Object> payload
) {
}
