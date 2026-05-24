package com.hellengi.biolab.api.dto;

public record CellDto(
        long id,
        double x,
        double y,
        double vx,
        double vy,
        double energy,
        double radius,
        boolean dead, // remove, change to alive
        GenomeDto genome, // there will be several genomes (nucleus, chloroplast, etc.)
        long lifetimeTicks, // remove, change to spawnTime/other name
        double localLight, // rename to irradiance
        double mass,
        double density,
        CellMotionDto motion,
        double directionAngle // rename to angle
        // add: alive, rotting (for died), spawnTime (ticks at birthday), color, opacity
        // add: name - auto for cells (photos, etc.), if save in db - custom
        // add: name - if already saved similar in db - use custom (what names for custom mutated?)
        // cell state (E, R) - CellDto, CellMotionDto
        //      SpawnCellRequestDto remove; change to CellDto, CellMotionDto
        //      CellDto rename to CellStateDto?
        //      CellStateDto for energy, x, y, vx, vy etc. E Inner
        //      CellParameters/other name for radius, speed etc. R
        //      third for irradiance, gravForce, dragForce etc. E Outer
        // cell genome (T) - GenomeDto // CellTemplateDto
        //      various dtos for various organelles
        // cell constants (C) - SimulationSettingsDto - everything from yml
) {
}