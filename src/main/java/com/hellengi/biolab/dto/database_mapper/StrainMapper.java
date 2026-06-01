package com.hellengi.biolab.dto.database_mapper;

import com.hellengi.biolab.database.entity.StrainEntity;
import com.hellengi.biolab.dto.StrainDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class StrainMapper {
    private final GenomeEntityMapper genomeMapper;

    public StrainEntity toEntity(String name, StrainDto dto, LocalDateTime createdAt) {
        return new StrainEntity(name, createdAt, genomeMapper.toEntity(dto.genome()));
    }

    public StrainDto toDto(StrainEntity entity) {
        return new StrainDto(entity.getId(), entity.getName(), genomeMapper.toDto(entity.getGenome()));
    }
}