package com.hellengi.biolab.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Full selected-cell payload. It is intentionally not part of the common render
 * frame because genomes, slots diagnostics, events and motion vectors are only
 * needed for the inspected cell.
 */
public record CellDetailsDto(
        long tick,
        Long cellId,
        CellDto cell
) {
    @JsonProperty("type")
    public String type() {
        return "cellDetails";
    }
}
