package com.hellengi.biolab.dto;

import java.util.Objects;

public record DisplayLayersDto(
        boolean opacityMap,
        boolean directedLightMap,
        boolean scatteredLightMap,
        boolean lightDirection,
        boolean quadtree,
        boolean cellDirections,
        Long selectedCellId,
        String selectedCellMode
) {
    public boolean selectedForcesEnabled(long cellId) {
        return selectedCellId != null
                && Objects.equals(selectedCellId, cellId)
                && "forces".equalsIgnoreCase(normalizedSelectedCellMode());
    }

    public boolean hasLightingDebugLayers() {
        return opacityMap || directedLightMap || scatteredLightMap || lightDirection || quadtree;
    }

    public boolean hasSelectedCell() {
        return selectedCellId != null;
    }

    /**
     * The hot render stream is independent from debug layers and selected-cell
     * state. Keeping this key fully off lets all clients sharing a viewport reuse
     * one binary render payload.
     */
    public DisplayLayersDto renderKey() {
        return off();
    }

    /**
     * Lighting/debug payloads only depend on debug layers. Selection and cell
     * direction overlay must not fragment lighting groups.
     */
    public DisplayLayersDto lightingKey() {
        return new DisplayLayersDto(
                opacityMap,
                directedLightMap,
                scatteredLightMap,
                lightDirection,
                quadtree,
                false,
                null,
                "general"
        );
    }

    /**
     * Details requests are keyed only by selected cell and mode. General render
     * layers must not prevent grouping selected-cell payloads.
     */
    public DisplayLayersDto selectedCellKey() {
        return new DisplayLayersDto(
                false,
                false,
                false,
                false,
                false,
                false,
                selectedCellId,
                normalizedSelectedCellMode()
        );
    }

    public DisplayLayersDto normalized() {
        return new DisplayLayersDto(
                opacityMap,
                directedLightMap,
                scatteredLightMap,
                lightDirection,
                quadtree,
                cellDirections,
                selectedCellId,
                normalizedSelectedCellMode()
        );
    }

    public String normalizedSelectedCellMode() {
        String mode = selectedCellMode == null || selectedCellMode.isBlank()
                ? "general"
                : selectedCellMode.trim().toLowerCase();
        return switch (mode) {
            case "forces", "health", "energy" -> mode;
            default -> "general";
        };
    }

    public static DisplayLayersDto off() {
        return new DisplayLayersDto(false, false, false, false, false, false, null, "general");
    }
}


