package com.hellengi.biolab.dto;

public record DisplayLayersDto(
        boolean opacityMap,
        boolean lightDirection,
        boolean quadtree,
        boolean cellDirections
) {
    public static DisplayLayersDto off() {
        return new DisplayLayersDto(false, false, false, false);
    }
}
