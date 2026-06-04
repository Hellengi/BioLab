
package com.hellengi.biolab.dto;

public record DisplayLayersDto(
        boolean opacityMap,
        boolean lightDirection,
        boolean quadtree,
        boolean cellDirections,
        Long selectedCellId,
        String selectedCellMode
) {
    public boolean selectedForcesEnabled(long cellId) {
        return selectedCellId != null
                && selectedCellId == cellId
                && "forces".equalsIgnoreCase(selectedCellMode);
    }

    public static DisplayLayersDto off() {
        return new DisplayLayersDto(false, false, false, false, null, "general");
    }
}
