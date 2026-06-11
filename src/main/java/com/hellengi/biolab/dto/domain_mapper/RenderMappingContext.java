package com.hellengi.biolab.dto.domain_mapper;

/**
 * Immutable per-frame mapping context. It replaces mutable light-map fields in
 * singleton mappers and makes render/detail encoding safe to move outside the
 * world lock or parallelize later.
 */
public record RenderMappingContext(
        double[] lightMap,
        double[] lightDirXMap,
        double[] lightDirYMap,
        int lightCols,
        int lightRows,
        int gridStep,
        double globalLight
) {
    public RenderMappingContext {
        gridStep = Math.max(1, gridStep);
        lightCols = Math.max(0, lightCols);
        lightRows = Math.max(0, lightRows);
        globalLight = Math.max(0.0, globalLight);
    }

    public static RenderMappingContext empty(double globalLight) {
        return new RenderMappingContext(null, null, null, 0, 0, 1, globalLight);
    }
}
