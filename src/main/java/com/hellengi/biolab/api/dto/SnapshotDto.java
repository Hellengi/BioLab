package com.hellengi.biolab.api.dto;

import java.time.LocalDateTime;

public record SnapshotDto(
        Long id,
        String name,
        LocalDateTime createdAt
) {
}