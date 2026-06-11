
package com.hellengi.biolab.api.controller;

import com.hellengi.biolab.database.service.StrainService;
import com.hellengi.biolab.domain.SimulationEngine;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.spawn.CellFactory;
import com.hellengi.biolab.dto.StrainDto;
import com.hellengi.biolab.dto.SpawnCellRequestDto;
import com.hellengi.biolab.dto.CellPreviewDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cell")
@RequiredArgsConstructor
public class CellController {
    private final SimulationEngine simulationEngine;
    private final StrainService strainService;
    private final CellFactory cellFactory;

    @GetMapping("/strains")
    public ResponseEntity<List<StrainDto>> list() {
        return ResponseEntity.ok(strainService.list());
    }

    @GetMapping("/strains/{id}")
    public ResponseEntity<StrainDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(strainService.get(id));
    }

    @PostMapping("/strains")
    public ResponseEntity<StrainDto> save(@RequestParam String name, @RequestBody StrainDto cell) {
        return ResponseEntity.ok(strainService.save(name, cell));
    }

    @DeleteMapping("/strains/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        strainService.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @PostMapping("/spawn")
    public ResponseEntity<Map<String, String>> spawnCell(@RequestBody SpawnCellRequestDto requestDto) {
        simulationEngine.spawnCell(requestDto);
        return ResponseEntity.ok(Map.of("status", "spawned"));
    }

    @PostMapping("/preview")
    public ResponseEntity<CellPreviewDto> previewCell(@RequestBody SpawnCellRequestDto requestDto) {
        Cell cell = cellFactory.createPreviewCell(requestDto);
        return ResponseEntity.ok(new CellPreviewDto(
                cell.getRadius(),
                cell.getCellArea(),
                cell.getMass(),
                cell.getDryMass(),
                cell.getDensity(),
                cell.getEnergy(),
                cell.getMaxEnergy(),
                cell.getDivisionEnergyCost(),
                cell.getNucleoidArea(),
                cell.getNucleoidMass(),
                cell.getCytosolArea(),
                cell.getCytosolMass(),
                cell.getMembraneLength(),
                cell.getMembraneArea(),
                cell.getMembraneMass(),
                cell.getMembraneOpacity(),
                cell.getMembraneLightTransmittance(),
                cell.getCpTotalArea(),
                cell.getCpTotalMass(),
                cell.getLightCapture(),
                cell.getCarotProtection(),
                cell.getLysosomeTotalArea(),
                cell.getLysosomeTotalMass(),
                cell.getLysosomeCapacity(),
                cell.getFlagellumTotalArea(),
                cell.getFlagellumTotalMass(),
                cell.getFlagellumCapacity()
        ));
    }
}
