package com.hellengi.biolab.database.service;

import com.hellengi.biolab.database.entity.SnapshotEntity;
import com.hellengi.biolab.database.repository.SnapshotRepository;
import com.hellengi.biolab.domain.SimulationEngine;
import com.hellengi.biolab.dto.SnapshotDto;
import com.hellengi.biolab.dto.database_mapper.SnapshotMapper;
import com.hellengi.biolab.util.NameValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SnapshotService {
    private final SnapshotRepository snapshotRepository;
    private final SnapshotMapper snapshotMapper;
    private final SimulationEngine simulationEngine;

    @Transactional
    public SnapshotDto save(String name) {
        SnapshotDto snapshot = simulationEngine.createSnapshot();
        SnapshotEntity entity = snapshotMapper.toEntity(
                NameValidator.normalize(name, "Snapshot name", 200),
                LocalDateTime.now(),
                snapshot
        );
        return snapshotMapper.toDto(snapshotRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<SnapshotDto> list() {
        return snapshotRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(snapshotMapper::toDto)
                .toList();
    }

    @Transactional
    public void load(Long id) {
        SnapshotEntity snapshot = snapshotRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Snapshot not found: " + id));
        simulationEngine.loadSnapshot(snapshotMapper.toDto(snapshot));
    }

    @Transactional
    public void delete(Long id) {
        if (!snapshotRepository.existsById(id)) {
            throw new IllegalArgumentException("Snapshot not found: " + id);
        }
        snapshotRepository.deleteById(id);
    }
}
