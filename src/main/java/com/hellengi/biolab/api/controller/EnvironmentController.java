package com.hellengi.biolab.api.controller;

import com.hellengi.biolab.api.dto.EnvironmentSnapshotDto;
import com.hellengi.biolab.persistence.service.EnvironmentSnapshotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/environments")
@RequiredArgsConstructor
public class EnvironmentController {
    private final EnvironmentSnapshotService environmentStorageService;

    @PostMapping
    public ResponseEntity<EnvironmentSnapshotDto> save(@RequestParam String name) {
        return ResponseEntity.ok(environmentStorageService.save(name));
    }

    @GetMapping
    public ResponseEntity<List<EnvironmentSnapshotDto>> list() {
        return ResponseEntity.ok(environmentStorageService.list());
    }

    @PostMapping("/{id}/load")
    public ResponseEntity<Map<String, String>> load(@PathVariable Long id) {
        environmentStorageService.loadEnvironmentSnapshot(id);
        return ResponseEntity.ok(Map.of("status", "loaded"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        environmentStorageService.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}