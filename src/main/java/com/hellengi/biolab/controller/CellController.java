package com.hellengi.biolab.controller;

import com.hellengi.biolab.dto.CellTemplateDto;
import com.hellengi.biolab.dto.CreateCellRequestDto;
import com.hellengi.biolab.dto.SaveCellTemplateRequestDto;
import com.hellengi.biolab.service.CellTemplateService;
import com.hellengi.biolab.service.SimulationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cells")
@CrossOrigin
public class CellController {

    private final SimulationService simulationService;
    private final CellTemplateService cellTemplateService;

    public CellController(
            SimulationService simulationService,
            CellTemplateService cellTemplateService
    ) {
        this.simulationService = simulationService;
        this.cellTemplateService = cellTemplateService;
    }

    @GetMapping("/templates")
    public ResponseEntity<List<CellTemplateDto>> listTemplates() {
        return ResponseEntity.ok(cellTemplateService.list());
    }

    @GetMapping("/templates/{id}")
    public ResponseEntity<CellTemplateDto> getTemplate(@PathVariable Long id) {
        return ResponseEntity.ok(cellTemplateService.get(id));
    }

    @PostMapping("/templates")
    public ResponseEntity<CellTemplateDto> saveTemplate(@RequestBody SaveCellTemplateRequestDto requestDto) {
        return ResponseEntity.ok(cellTemplateService.save(requestDto.name(), requestDto.cell()));
    }

    @PostMapping("/spawn")
    public ResponseEntity<Map<String, String>> spawnCell(@RequestBody CreateCellRequestDto requestDto) {
        simulationService.createCell(requestDto);
        return ResponseEntity.ok(Map.of("status", "spawned"));
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<Map<String, String>> deleteTemplate(@PathVariable Long id) {
        cellTemplateService.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}