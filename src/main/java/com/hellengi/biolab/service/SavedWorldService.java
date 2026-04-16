package com.hellengi.biolab.service;

import com.hellengi.biolab.dto.SavedWorldListItemDto;
import com.hellengi.biolab.dto.SavedWorldSnapshotDto;
import com.hellengi.biolab.model.SavedWorld;
import com.hellengi.biolab.repository.SavedWorldRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SavedWorldService {

    private final SavedWorldRepository savedWorldRepository;
    private final JsonMapper jsonMapper;

    public SavedWorldService(
            SavedWorldRepository savedWorldRepository,
            JsonMapper jsonMapper
    ) {
        this.savedWorldRepository = savedWorldRepository;
        this.jsonMapper = jsonMapper;
    }

    @Transactional
    public SavedWorldListItemDto save(String name, SavedWorldSnapshotDto snapshot) {
        try {
            String normalizedName = normalizeName(name);
            String worldJson = jsonMapper.writeValueAsString(snapshot.world());
            String configJson = jsonMapper.writeValueAsString(snapshot.config());

            SavedWorld savedWorld = new SavedWorld(
                    normalizedName,
                    LocalDateTime.now(),
                    worldJson,
                    configJson
            );

            SavedWorld persisted = savedWorldRepository.save(savedWorld);

            return new SavedWorldListItemDto(
                    persisted.getId(),
                    persisted.getName(),
                    persisted.getCreatedAt()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to save world", e);
        }
    }

    @Transactional(readOnly = true)
    public List<SavedWorldListItemDto> list() {
        return savedWorldRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(savedWorld -> new SavedWorldListItemDto(
                        savedWorld.getId(),
                        savedWorld.getName(),
                        savedWorld.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public SavedWorldSnapshotDto load(Long id) {
        SavedWorld savedWorld = savedWorldRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Saved world not found: " + id));

        try {
            return new SavedWorldSnapshotDto(
                    jsonMapper.readValue(savedWorld.getWorldJson(), com.hellengi.biolab.dto.WorldStateDto.class),
                    jsonMapper.readValue(savedWorld.getConfigJson(), com.hellengi.biolab.dto.SimulationConfigDto.class)
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to load world", e);
        }
    }

    private String normalizeName(String name) {
        if (name == null) {
            throw new IllegalArgumentException("World name must not be null");
        }

        String trimmed = name.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("World name must not be empty");
        }

        if (trimmed.length() > 200) {
            throw new IllegalArgumentException("World name is too long");
        }

        return trimmed;
    }

    @Transactional
    public void delete(Long id) {
        if (!savedWorldRepository.existsById(id)) {
            throw new IllegalArgumentException("Saved world not found: " + id);
        }
        savedWorldRepository.deleteById(id);
    }
}