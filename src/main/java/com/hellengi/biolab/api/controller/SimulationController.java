package com.hellengi.biolab.api.controller;

import com.hellengi.biolab.database.service.SnapshotService;
import com.hellengi.biolab.domain.SimulationEngine;
import com.hellengi.biolab.dto.LightProbeDto;
import com.hellengi.biolab.dto.SimulationSettingsDto;
import com.hellengi.biolab.dto.SimulationWorldDto;
import com.hellengi.biolab.dto.SnapshotDto;
import com.hellengi.biolab.metrics.BaselineScenarioRequestDto;
import com.hellengi.biolab.metrics.EventLogAppendRequestDto;
import com.hellengi.biolab.metrics.EventLogEntryDto;
import com.hellengi.biolab.metrics.EventLogStore;
import com.hellengi.biolab.metrics.PerformanceMetricsRegistry;
import com.hellengi.biolab.metrics.PerformanceMetricsSnapshotDto;
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
    private final PerformanceMetricsRegistry performanceMetrics;
    private final EventLogStore eventLogStore;

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> reset(@RequestParam(defaultValue = "true") boolean log) {
        simulationEngine.reset();
        if (log) {
            eventLogStore.append(new EventLogAppendRequestDto(
                    "world-reset",
                    "World reset",
                    "Simulation world reset to initial state.",
                    "info",
                    "R",
                    Map.of("source", "server")
            ));
        }
        return ResponseEntity.ok(Map.of("status", "reset"));
    }

    @GetMapping("/event-log")
    public ResponseEntity<List<EventLogEntryDto>> eventLog() {
        return ResponseEntity.ok(eventLogStore.list());
    }

    @PostMapping("/event-log")
    public ResponseEntity<EventLogEntryDto> appendEventLog(@RequestBody EventLogAppendRequestDto requestDto) {
        return ResponseEntity.ok(eventLogStore.append(requestDto));
    }

    @DeleteMapping("/event-log")
    public ResponseEntity<Map<String, String>> clearEventLog() {
        eventLogStore.clear();
        return ResponseEntity.ok(Map.of("status", "cleared"));
    }


    @GetMapping("/metrics/performance")
    public ResponseEntity<PerformanceMetricsSnapshotDto> performanceMetrics() {
        return ResponseEntity.ok(performanceMetrics.snapshot());
    }

    @PostMapping("/metrics/performance/reset")
    public ResponseEntity<Map<String, String>> resetPerformanceMetrics() {
        performanceMetrics.reset();
        return ResponseEntity.ok(Map.of("status", "reset"));
    }

    @PostMapping("/benchmark/reset")
    public ResponseEntity<Map<String, String>> resetForBenchmark(@RequestBody(required = false) BaselineScenarioRequestDto requestDto) {
        simulationEngine.resetForBaseline(requestDto);
        return ResponseEntity.ok(Map.of(
                "status", "reset",
                "scenario", requestDto == null ? "manual" : requestDto.normalizedName()
        ));
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






