package com.hellengi.biolab.database.service;

import com.hellengi.biolab.api.dto.CellTemplateDto;
import com.hellengi.biolab.database.entity.CellTemplateEntity;
import com.hellengi.biolab.mapper.database.CellTemplateMapper;
import com.hellengi.biolab.database.repository.CellTemplateRepository;
import com.hellengi.biolab.util.NameValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CellTemplateService {
    private final CellTemplateRepository repository;
    private final CellTemplateMapper cellTemplateMapper;

    @Transactional
    public CellTemplateDto save(String name, CellTemplateDto dto) {
        String normalizedName = NameValidator.normalize(name, "Cell name", 200);

        CellTemplateEntity entity = cellTemplateMapper.toEntity(
                normalizedName,
                dto,
                LocalDateTime.now()
        );

        CellTemplateEntity cellTemplateEntity = repository.save(entity);
        return cellTemplateMapper.toDto(cellTemplateEntity);
    }

    @Transactional(readOnly = true)
    public List<CellTemplateDto> list() {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(cellTemplateMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public CellTemplateDto get(Long id) {
        CellTemplateEntity entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cell template not found: " + id));

        return cellTemplateMapper.toDto(entity);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Cell template not found: " + id);
        }

        repository.deleteById(id);
    }
}