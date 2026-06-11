package com.hellengi.biolab.metrics;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class EventLogStore {
    private static final int MAX_ENTRIES = 500;

    private final List<EventLogEntryDto> entries = new ArrayList<>();

    public synchronized List<EventLogEntryDto> list() {
        return List.copyOf(entries);
    }

    public synchronized EventLogEntryDto append(EventLogAppendRequestDto request) {
        EventLogEntryDto entry = new EventLogEntryDto(
                UUID.randomUUID().toString(),
                textOr(request == null ? null : request.type(), "event"),
                textOr(request == null ? null : request.title(), "Event"),
                textOr(request == null ? null : request.body(), ""),
                textOr(request == null ? null : request.tone(), "info"),
                textOr(request == null ? null : request.icon(), "i"),
                Instant.now().toString(),
                safePayload(request == null ? null : request.payload())
        );
        entries.add(entry);
        trim();
        return entry;
    }

    public synchronized void clear() {
        entries.clear();
    }

    private void trim() {
        int overflow = entries.size() - MAX_ENTRIES;
        if (overflow <= 0) {
            return;
        }
        entries.subList(0, overflow).clear();
    }

    private String textOr(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }

    private Map<String, Object> safePayload(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return Map.of();
        }
        return new LinkedHashMap<>(payload);
    }
}
