package com.hellengi.biolab.api.controller;

import com.hellengi.biolab.api.dto.EnvironmentDto;
import com.hellengi.biolab.api.dto.SimulationSettingsDto;
import com.hellengi.biolab.simulation.SimulationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/simulation")
@RequiredArgsConstructor
public class SimulationController {
    private final SimulationService simulationService;

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> reset() {
        simulationService.reset();
        return ResponseEntity.ok(Map.of("status", "reset"));
    }

    @GetMapping("/state")
    public ResponseEntity<EnvironmentDto> state() {
        return ResponseEntity.ok(simulationService.getState());
    }

    @GetMapping("/config")
    public ResponseEntity<SimulationSettingsDto> config() {
        return ResponseEntity.ok(simulationService.getConfig());
    }

    @PutMapping("/config")
    public ResponseEntity<SimulationSettingsDto> updateConfig(@RequestBody SimulationSettingsDto configDto) {
        return ResponseEntity.ok(simulationService.updateConfig(configDto));
    }

    @PostMapping("/config/reset")
    public ResponseEntity<SimulationSettingsDto> resetConfigToDefaults() {
        return ResponseEntity.ok(simulationService.resetConfigToDefaults());
    }
}
