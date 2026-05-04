package com.hellengi.biolab.persistence.service;

import com.hellengi.biolab.api.dto.EnvironmentDto;
import com.hellengi.biolab.api.dto.EnvironmentSnapshotDto;
import com.hellengi.biolab.api.dto.SimulationSettingsDto;
import com.hellengi.biolab.persistence.entity.EnvironmentSnapshot;
import com.hellengi.biolab.persistence.repository.EnvironmentSnapshotRepository;
import com.hellengi.biolab.simulation.SimulationCommands;
import com.hellengi.biolab.simulation.SimulationConfigService;
import com.hellengi.biolab.simulation.SimulationRuntimeConfig;
import com.hellengi.biolab.simulation.EnvironmentMapper;
import com.hellengi.biolab.simulation.world.SimulationEnvironment;
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
    private final JsonMapper jsonMapper;

    private final SimulationEnvironment env;
    private final EnvironmentMapper environmentMapper;
    private final SimulationRuntimeConfig runtimeConfig;
    private final SimulationCommands simulationCommands;
    private final SimulationConfigService simulationConfigService;

    @Transactional
    public EnvironmentSnapshotDto save(String name) {
        EnvironmentDto envDto;
        SimulationSettingsDto configDto;

        synchronized (env) {
            envDto = environmentMapper.toDto(env, runtimeConfig.getDeadCellLifetimeTicks());
            configDto = simulationConfigService.getConfig();
        }

        try {
            String envJson = jsonMapper.writeValueAsString(envDto);
            String configJson = jsonMapper.writeValueAsString(configDto);
            EnvironmentSnapshot entity = new EnvironmentSnapshot(
                    NameValidator.normalize(name, "Environment name", 200),
                    LocalDateTime.now(), envJson, configJson);
            return toListItemDto(environmentSnapshotRepository.save(entity));
        } catch (Exception e) {
            throw new RuntimeException("Failed to save environment", e);
        }
    }

    @Transactional(readOnly = true)
    public List<EnvironmentSnapshotDto> list() {
        return environmentSnapshotRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toListItemDto)
                .toList();
    }

    @Transactional
    public void loadEnvironmentSnapshot(Long id) {
        EnvironmentSnapshot envSnapshot = environmentSnapshotRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Not found: " + id));
        try {
            EnvironmentDto envDto = jsonMapper.readValue(envSnapshot.getStateJson(), EnvironmentDto.class);
            SimulationSettingsDto configDto = jsonMapper.readValue(envSnapshot.getConfigJson(), SimulationSettingsDto.class);
            simulationCommands.loadSnapshot(envDto, configDto);
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

    private EnvironmentSnapshotDto toListItemDto(EnvironmentSnapshot environmentSnapshot) {
        return new EnvironmentSnapshotDto(
                environmentSnapshot.getId(),
                environmentSnapshot.getName(),
                environmentSnapshot.getCreatedAt()
        );
    }
}