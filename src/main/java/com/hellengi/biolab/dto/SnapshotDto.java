package com.hellengi.biolab.dto;

import java.time.LocalDateTime;

public record SnapshotDto(
        Long id,
        String name,
        LocalDateTime createdAt,
        SimulationWorldDto world,
        SimulationSettingsDto settings
) {
}