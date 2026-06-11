package com.hellengi.biolab.dto;

public record CellPreviewDto(
        double radius,
        double cellArea,
        double mass,
        double dryMass,
        double density,
        double energy,
        double maxEnergy,
        double divisionEnergyCost,
        double nucleoidArea,
        double nucleoidMass,
        double cytosolArea,
        double cytosolMass,
        double membraneLength,
        double membraneArea,
        double membraneMass,
        double membraneOpacity,
        double membraneTransmittance,
        double chloroplastArea,
        double chloroplastMass,
        double lightCapture,
        double carotProtection,
        double lysosomeArea,
        double lysosomeMass,
        int lysosomeCapacity,
        double flagellumArea,
        double flagellumMass,
        int flagellumCapacity
) {
}
