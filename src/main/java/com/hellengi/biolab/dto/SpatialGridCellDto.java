package com.hellengi.biolab.dto;

/**
 * Visible occupied bucket of the SpatialHashGrid used by broad-phase lookup.
 * Buckets index entity centers only; simulated cell bodies may overlap
 * neighbouring buckets and are checked exactly after lookup.
 */
public record SpatialGridCellDto(
        double x,
        double y,
        double width,
        double height
) {
}
