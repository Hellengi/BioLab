package com.hellengi.biolab.dto;

public record SavedWorldSnapshotDto(
        WorldStateDto world,
        SimulationConfigDto config
) {
}