package com.hellengi.biolab.api.controller;

import com.hellengi.biolab.api.dto.CellTemplateDto;
import com.hellengi.biolab.api.dto.SpawnCellRequestDto;
import com.hellengi.biolab.database.service.CellTemplateService;
import com.hellengi.biolab.domain.SimulationEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cells")
@RequiredArgsConstructor
public class CellController {
    private final SimulationEngine simulationEngine;
    private final CellTemplateService cellTemplateService;

    @GetMapping("/templates")
    public ResponseEntity<List<CellTemplateDto>> listTemplates() {
        return ResponseEntity.ok(cellTemplateService.list());
    }

    @GetMapping("/templates/{id}")
    public ResponseEntity<CellTemplateDto> getTemplate(@PathVariable Long id) {
        return ResponseEntity.ok(cellTemplateService.get(id));
    }

    @PostMapping("/templates")
    public ResponseEntity<CellTemplateDto> saveTemplate(@RequestParam String name, @RequestBody CellTemplateDto cell) {
        return ResponseEntity.ok(cellTemplateService.save(name, cell));
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<Map<String, String>> deleteTemplate(@PathVariable Long id) {
        cellTemplateService.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @PostMapping("/spawn")
    public ResponseEntity<Map<String, String>> spawnCell(@RequestBody SpawnCellRequestDto requestDto) {
        simulationEngine.spawnCell(requestDto);
        return ResponseEntity.ok(Map.of("status", "spawned"));
    }
}