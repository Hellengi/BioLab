package com.hellengi.biolab.api.controller;

import com.hellengi.biolab.database.service.SnapshotService;
import com.hellengi.biolab.domain.SimulationEngine;
import com.hellengi.biolab.dto.LightProbeDto;
import com.hellengi.biolab.dto.SimulationSettingsDto;
import com.hellengi.biolab.dto.SimulationWorldDto;
import com.hellengi.biolab.dto.SnapshotDto;
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

    @GetMapping("/world")
    public ResponseEntity<SimulationWorldDto> state() {
        return ResponseEntity.ok(simulationEngine.getWorldDto());
    }

    @GetMapping("/light")
    public ResponseEntity<LightProbeDto> lightAt(
            @RequestParam double x,
            @RequestParam double y
    ) {
        return ResponseEntity.ok(simulationEngine.sampleLightAt(x, y));
    }

    @GetMapping("/config")
    public ResponseEntity<SimulationSettingsDto> config() {
        return ResponseEntity.ok(simulationEngine.getSettingsDto());
    }

    @PutMapping("/config")
    public ResponseEntity<SimulationSettingsDto> updateConfig(@RequestBody SimulationSettingsDto configDto) {
        return ResponseEntity.ok(simulationEngine.updateSettings(configDto));
    }

    @PostMapping("/config/reset")
    public ResponseEntity<SimulationSettingsDto> resetConfig() {
        return ResponseEntity.ok(simulationEngine.resetSettings());
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
        snapshotService.load(id);
        return ResponseEntity.ok(Map.of("status", "loaded"));
    }

    @DeleteMapping("/snapshots/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        snapshotService.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
