package com.hellengi.biolab.persistence.service;

import com.hellengi.biolab.api.dto.CellTemplateDto;
import com.hellengi.biolab.api.dto.GenomeDto;
import com.hellengi.biolab.persistence.entity.CellTemplate;
import com.hellengi.biolab.persistence.entity.GenomeSnapshot;
import com.hellengi.biolab.persistence.repository.CellTemplateRepository;
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

    @Transactional
    public CellTemplateDto save(String name, CellTemplateDto dto) {
        String normalizedName = NameValidator.normalize(name, "Cell name", 200);

        GenomeSnapshot genome = new GenomeSnapshot(
                dto.genome().divisionThreshold(),
                dto.genome().divisionImpulseStrength(),
                dto.genome().colorHue(),
                dto.genome().saturation(),
                dto.genome().lightness(),
                dto.genome().maxEnergy()
        );

        CellTemplate entity = new CellTemplate(
                normalizedName,
                LocalDateTime.now(),
                genome
        );

        CellTemplate cellTemplate = repository.save(entity);
        return toDto(cellTemplate);
    }

    @Transactional(readOnly = true)
    public List<CellTemplateDto> list() {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public CellTemplateDto get(Long id) {
        CellTemplate entity = repository.findById(id)
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

    private CellTemplateDto toDto(CellTemplate entity) {
        GenomeSnapshot genome = entity.getGenome();
        return new CellTemplateDto(
                entity.getId(),
                entity.getName(),
                new GenomeDto(
                        genome.getDivisionThreshold(),
                        genome.getDivisionImpulseStrength(),
                        genome.getColorHue(),
                        genome.getSaturation(),
                        genome.getLightness(),
                        genome.getMaxEnergy(),
                        null
                )
        );
    }
}