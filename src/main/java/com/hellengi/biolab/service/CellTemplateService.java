package com.hellengi.biolab.service;

import com.hellengi.biolab.dto.CellTemplateDto;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.model.SavedCellTemplate;
import com.hellengi.biolab.repository.SavedCellTemplateRepository;
import com.hellengi.biolab.util.GenomeCodeCodec;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CellTemplateService {

    private final SavedCellTemplateRepository repository;

    public CellTemplateService(SavedCellTemplateRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public CellTemplateDto save(String name, CellTemplateDto dto) {
        String normalizedName = normalizeName(name);

        SavedCellTemplate entity = new SavedCellTemplate(
                normalizedName,
                LocalDateTime.now(),
                dto.divisionThreshold(),
                dto.divisionImpulseStrength(),
                dto.colorHue(),
                dto.lightness(),
                dto.maxEnergy()
        );

        SavedCellTemplate saved = repository.save(entity);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<CellTemplateDto> list() {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public CellTemplateDto get(Long id) {
        SavedCellTemplate entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cell template not found: " + id));

        return toDto(entity);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Cell template not found: " + id);
        }

        repository.deleteById(id);
    }

    private CellTemplateDto toDto(SavedCellTemplate entity) {
        Genome genome = new Genome(
                entity.getDivisionThreshold(),
                entity.getDivisionImpulseStrength(),
                entity.getColorHue(),
                entity.getLightness(),
                entity.getMaxEnergy()
        );

        return new CellTemplateDto(
                entity.getId(),
                entity.getName(),
                GenomeCodeCodec.encode(genome),
                entity.getDivisionThreshold(),
                entity.getDivisionImpulseStrength(),
                entity.getColorHue(),
                entity.getLightness(),
                entity.getMaxEnergy()
        );
    }

    private String normalizeName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Cell name must not be empty");
        }

        String trimmed = name.trim();
        if (trimmed.length() > 200) {
            throw new IllegalArgumentException("Cell name is too long");
        }

        return trimmed;
    }
}