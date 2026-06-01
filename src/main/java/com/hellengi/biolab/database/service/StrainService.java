package com.hellengi.biolab.database.service;

import com.hellengi.biolab.database.entity.StrainEntity;
import com.hellengi.biolab.dto.database_mapper.StrainMapper;
import com.hellengi.biolab.database.repository.StrainRepository;
import com.hellengi.biolab.dto.StrainDto;
import com.hellengi.biolab.util.NameValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StrainService {
    private final StrainRepository repository;
    private final StrainMapper strainMapper;

    @Transactional
    public StrainDto save(String name, StrainDto dto) {
        if (dto == null || dto.genome() == null) {
            throw new IllegalArgumentException("Cell genome must not be null");
        }
        String normalizedName = NameValidator.normalize(name, "Cell name", 200);
        StrainEntity entity = strainMapper.toEntity(normalizedName, dto, LocalDateTime.now());
        return strainMapper.toDto(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<StrainDto> list() {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(strainMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public StrainDto get(Long id) {
        StrainEntity entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Strain not found: " + id));
        return strainMapper.toDto(entity);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Strain not found: " + id);
        }
        repository.deleteById(id);
    }
}