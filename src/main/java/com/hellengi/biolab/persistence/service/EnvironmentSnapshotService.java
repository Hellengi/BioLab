package com.hellengi.biolab.persistence.service;

import com.hellengi.biolab.api.dto.EnvironmentDto;
import com.hellengi.biolab.api.dto.EnvironmentSnapshotDto;
import com.hellengi.biolab.api.dto.SimulationSettingsDto;
import com.hellengi.biolab.persistence.entity.EnvironmentSnapshotEntity;
import com.hellengi.biolab.persistence.mapper.EnvironmentSnapshotMapper;
import com.hellengi.biolab.persistence.repository.EnvironmentSnapshotRepository;
import com.hellengi.biolab.simulation.SimulationControl;
import com.hellengi.biolab.simulation.settings.SimulationSettings;
import com.hellengi.biolab.simulation.settings.RuntimeOverrides;
import com.hellengi.biolab.simulation.mapper.EnvironmentMapper;
import com.hellengi.biolab.simulation.world.WorldState;
import com.hellengi.biolab.util.NameValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EnvironmentSnapshotService {
    private final EnvironmentSnapshotRepository environmentSnapshotRepository;
    private final EnvironmentSnapshotMapper environmentSnapshotMapper;
    private final JsonMapper jsonMapper;

    private final WorldState env;
    private final EnvironmentMapper environmentMapper;
    private final RuntimeOverrides runtimeConfig;
    private final SimulationControl simulationControl;
    private final SimulationSettings simulationSettings;

    @Transactional
    public EnvironmentSnapshotDto save(String name) {
        EnvironmentDto envDto;
        SimulationSettingsDto configDto;

        synchronized (env) {
            envDto = environmentMapper.toDto(env, runtimeConfig.getDeadCellLifetimeTicks(), 0L);
            configDto = simulationSettings.getConfig();
        }

        try {
            String envJson = jsonMapper.writeValueAsString(envDto);
            String configJson = jsonMapper.writeValueAsString(configDto);
            EnvironmentSnapshotEntity entity = environmentSnapshotMapper.toEntity(
                    NameValidator.normalize(name, "Environment name", 200),
                    LocalDateTime.now(),
                    envJson,
                    configJson
            );

            return environmentSnapshotMapper.toDto(environmentSnapshotRepository.save(entity));
        } catch (Exception e) {
            throw new RuntimeException("Failed to save environment", e);
        }
    }

    @Transactional(readOnly = true)
    public List<EnvironmentSnapshotDto> list() {
        return environmentSnapshotRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(environmentSnapshotMapper::toDto)
                .toList();
    }

    @Transactional
    public void loadEnvironmentSnapshot(Long id) {
        EnvironmentSnapshotEntity envSnapshot = environmentSnapshotRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Not found: " + id));
        try {
            EnvironmentDto envDto = jsonMapper.readValue(envSnapshot.getStateJson(), EnvironmentDto.class);
            SimulationSettingsDto configDto = jsonMapper.readValue(envSnapshot.getConfigJson(), SimulationSettingsDto.class);
            simulationControl.loadSnapshot(envDto, configDto);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load environment", e);
        }
    }

    @Transactional
    public void delete(Long id) {
        if (!environmentSnapshotRepository.existsById(id)) {
            throw new IllegalArgumentException("Environment snapshot not found: " + id);
        }

        environmentSnapshotRepository.deleteById(id);
    }
}