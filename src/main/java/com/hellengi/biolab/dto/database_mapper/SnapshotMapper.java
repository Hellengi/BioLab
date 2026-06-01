package com.hellengi.biolab.dto.database_mapper;

import com.hellengi.biolab.database.entity.SnapshotEntity;
import com.hellengi.biolab.dto.SimulationSettingsDto;
import com.hellengi.biolab.dto.SimulationWorldDto;
import com.hellengi.biolab.dto.SnapshotDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class SnapshotMapper {
    private final JsonMapper jsonMapper;

    public SnapshotEntity toEntity(String name, LocalDateTime createdAt, String stateJson, String configJson) {
        return new SnapshotEntity(name, createdAt, stateJson, configJson);
    }

    public SnapshotDto toDto(SnapshotEntity entity) {
        SimulationWorldDto world = jsonMapper.readValue(entity.getWorldJson(), SimulationWorldDto.class);
        SimulationSettingsDto settings = jsonMapper.readValue(entity.getConfigJson(), SimulationSettingsDto.class);
        return new SnapshotDto(entity.getId(), entity.getName(), entity.getCreatedAt(), world, settings);
    }
}