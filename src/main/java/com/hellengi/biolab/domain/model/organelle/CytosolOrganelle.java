package com.hellengi.biolab.domain.model.organelle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import lombok.Getter;
import lombok.Setter;

import static com.hellengi.biolab.util.Utils.percent01;

@Getter
@Setter
public class CytosolOrganelle implements Organelle {
    private static final double ENERGY_CAPACITY_PER_AREA = 0.72;

    private double area;
    private double density;
    private boolean gfpEnabled;
    private double gfp;

    public CytosolOrganelle(double area, double density, boolean gfpEnabled, double gfp) {
        this.area = area;
        this.density = density;
        this.gfpEnabled = gfpEnabled;
        this.gfp = gfp;
    }

    public CytosolOrganelle copy() {
        return new CytosolOrganelle(area, density, gfpEnabled, gfp);
    }

    public double gfp01() {
        return gfpEnabled ? percent01(gfp) : 0.0;
    }

    public double maxEnergy() {
        return Math.max(0.0, area) * ENERGY_CAPACITY_PER_AREA;
    }

    public double energyConsumption(YamlConfig.CellProperties config, double cytosolMass) {
        return cytosolMass * config.getCytosolEnergyConsumptionFactor()
                + gfp01() * config.getCytosolGfpConsumptionFactor();
    }

    @Override
    public String code() {
        return "Ct";
    }

    @Override
    public String displayName() {
        return "Cytosol";
    }

    @Override
    public boolean present() {
        return true;
    }

    @Override
    public double mass(Cell cell, YamlConfig.CellProperties config) {
        double baseArea = Math.max(0.0, area) * config.getCytosolAreaFactor();
        return Math.max(0.0, density) * baseArea * config.getCytosolMassFactor()
                + Math.max(0.0, cell.getEnergy()) * config.getEnergyToMassFactor();
    }

    @Override
    public double area(Cell cell, YamlConfig.CellProperties config) {
        return Math.max(0.0, area) * config.getCytosolAreaFactor()
                + Math.max(0.0, cell.getEnergy()) * config.getEnergyToRadiusFactor();
    }
}





