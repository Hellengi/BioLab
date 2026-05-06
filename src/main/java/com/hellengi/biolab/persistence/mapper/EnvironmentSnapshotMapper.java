package com.hellengi.biolab.persistence.mapper;

import com.hellengi.biolab.api.dto.EnvironmentSnapshotDto;
import com.hellengi.biolab.persistence.entity.EnvironmentSnapshotEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class EnvironmentSnapshotMapper {

    public EnvironmentSnapshotEntity toEntity(
            String name,
            LocalDateTime createdAt,
            String stateJson,
            String configJson
    ) {
        return new EnvironmentSnapshotEntity(name, createdAt, stateJson, configJson);
    }

    public EnvironmentSnapshotDto toDto(EnvironmentSnapshotEntity entity) {
        return new EnvironmentSnapshotDto(
                entity.getId(),
                entity.getName(),
                entity.getCreatedAt()
        );
    }
}