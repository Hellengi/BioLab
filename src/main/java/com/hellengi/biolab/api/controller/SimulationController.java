package com.hellengi.biolab.api.controller;

import com.hellengi.biolab.api.dto.SimulationSettingsDto;
import com.hellengi.biolab.api.dto.SimulationWorldDto;
import com.hellengi.biolab.api.dto.SnapshotDto;
import com.hellengi.biolab.database.service.SnapshotService;
import com.hellengi.biolab.domain.SimulationEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/simulation")
@RequiredArgsConstructor
public class SimulationController {
    private final SimulationEngine simulationEngine;
    private final SnapshotService snapshotService;

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> reset() {
        simulationEngine.reset();
        return ResponseEntity.ok(Map.of("status", "reset"));
    }

    @GetMapping("/state")
    public ResponseEntity<SimulationWorldDto> state() {
        return ResponseEntity.ok(simulationEngine.getState());
    }

    @GetMapping("/config")
    public ResponseEntity<SimulationSettingsDto> config() {
        return ResponseEntity.ok(simulationEngine.getConfig());
    }

    @PutMapping("/config")
    public ResponseEntity<SimulationSettingsDto> updateConfig(@RequestBody SimulationSettingsDto configDto) {
        return ResponseEntity.ok(simulationEngine.updateConfig(configDto));
    }

    @PostMapping("/config/reset")
    public ResponseEntity<SimulationSettingsDto> resetConfigToDefaults() {
        return ResponseEntity.ok(simulationEngine.resetConfigToDefaults());
    }

    @PostMapping("/snapshots")
    public ResponseEntity<SnapshotDto> save(@RequestParam String name) {
        return ResponseEntity.ok(snapshotService.save(name));
    }

    @GetMapping("/snapshots")
    public ResponseEntity<List<SnapshotDto>> list() {
        return ResponseEntity.ok(snapshotService.list());
    }

    @PostMapping("/snapshots/{id}/load")
    public ResponseEntity<Map<String, String>> load(@PathVariable Long id) {
        snapshotService.loadSnapshot(id);
        return ResponseEntity.ok(Map.of("status", "loaded"));
    }

    @DeleteMapping("/snapshots/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        snapshotService.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
