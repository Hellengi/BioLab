package com.hellengi.biolab.dto;

import java.time.LocalDateTime;

public record SavedWorldListItemDto(
        Long id,
        String name,
        LocalDateTime createdAt
) {
}