package com.hellengi.biolab.controller;

import com.hellengi.biolab.dto.SimulationConfigDto;
import com.hellengi.biolab.dto.WorldStateDto;
import com.hellengi.biolab.dto.SavedWorldRequestDto;
import com.hellengi.biolab.dto.SavedWorldListItemDto;
import com.hellengi.biolab.service.SimulationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/simulation")
@CrossOrigin
public class SimulationController {

    private final SimulationService simulationService;

    public SimulationController(SimulationService simulationService) {
        this.simulationService = simulationService;
    }

    @PostMapping("/start")
    public ResponseEntity<Map<String, String>> start() {
        simulationService.start();
        return ResponseEntity.ok(Map.of("status", "started"));
    }

    @PostMapping("/stop")
    public ResponseEntity<Map<String, String>> stop() {
        simulationService.stop();
        return ResponseEntity.ok(Map.of("status", "stopped"));
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> reset() {
        simulationService.reset();
        return ResponseEntity.ok(Map.of("status", "reset"));
    }

    @GetMapping("/state")
    public ResponseEntity<WorldStateDto> state() {
        return ResponseEntity.ok(simulationService.getState());
    }

    @GetMapping("/config")
    public ResponseEntity<SimulationConfigDto> config() {
        return ResponseEntity.ok(simulationService.getConfig());
    }

    @PutMapping("/config")
    public ResponseEntity<SimulationConfigDto> updateConfig(@RequestBody SimulationConfigDto configDto) {
        return ResponseEntity.ok(simulationService.updateConfig(configDto));
    }

    @PostMapping("/config/reset")
    public ResponseEntity<SimulationConfigDto> resetConfigToDefaults() {
        return ResponseEntity.ok(simulationService.resetConfigToDefaults());
    }

    @PostMapping("/worlds")
    public ResponseEntity<SavedWorldListItemDto> saveWorld(@RequestBody SavedWorldRequestDto requestDto) {
        return ResponseEntity.ok(simulationService.saveWorld(requestDto.name()));
    }

    @GetMapping("/worlds")
    public ResponseEntity<List<SavedWorldListItemDto>> listSavedWorlds() {
        return ResponseEntity.ok(simulationService.listSavedWorlds());
    }

    @PostMapping("/worlds/{id}/load")
    public ResponseEntity<Map<String, String>> loadWorld(@PathVariable Long id) {
        simulationService.loadWorld(id);
        return ResponseEntity.ok(Map.of("status", "loaded"));
    }

    @DeleteMapping("/worlds/{id}")
    public ResponseEntity<Map<String, String>> deleteWorld(@PathVariable Long id) {
        simulationService.deleteWorld(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
