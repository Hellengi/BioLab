package com.hellengi.biolab.api.dto;

import java.time.LocalDateTime;

public record EnvironmentSnapshotDto(
        Long id,
        String name,
        LocalDateTime createdAt
) {
}