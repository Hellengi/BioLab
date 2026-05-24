package com.hellengi.biolab.mapper.database;

import com.hellengi.biolab.api.dto.SnapshotDto;
import com.hellengi.biolab.database.entity.SnapshotEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class SnapshotMapper {

    public SnapshotEntity toEntity(
            String name,
            LocalDateTime createdAt,
            String stateJson,
            String configJson
    ) {
        return new SnapshotEntity(name, createdAt, stateJson, configJson);
    }

    public SnapshotDto toDto(SnapshotEntity entity) {
        return new SnapshotDto(
                entity.getId(),
                entity.getName(),
                entity.getCreatedAt()
        );
    }
}