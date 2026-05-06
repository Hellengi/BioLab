package com.hellengi.biolab.persistence.mapper;

import com.hellengi.biolab.api.dto.CellTemplateDto;
import com.hellengi.biolab.persistence.entity.CellTemplateEntity;
import com.hellengi.biolab.persistence.entity.GenomeEmbeddable;
import com.hellengi.biolab.simulation.mapper.GenomeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class CellTemplateMapper {
    private final GenomeMapper genomeMapper;

    public CellTemplateEntity toEntity(String name, CellTemplateDto dto, LocalDateTime createdAt) {
        GenomeEmbeddable genome = genomeMapper.toSnapshot(dto.genome());
        return new CellTemplateEntity(name, createdAt, genome);
    }

    public CellTemplateDto toDto(CellTemplateEntity entity) {
        return new CellTemplateDto(
                entity.getId(),
                entity.getName(),
                genomeMapper.toDto(entity.getGenome())
        );
    }
}