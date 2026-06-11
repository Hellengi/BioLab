
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
    private boolean bioluminescenceEnabled;
    private double bioluminescence;

    public CytosolOrganelle(double area, double density, boolean bioluminescenceEnabled, double bioluminescence) {
        this.area = area;
        this.density = density;
        this.bioluminescenceEnabled = bioluminescenceEnabled;
        this.bioluminescence = bioluminescence;
    }

    public CytosolOrganelle copy() {
        return new CytosolOrganelle(area, density, bioluminescenceEnabled, bioluminescence);
    }

    public double bioluminescence01() {
        return bioluminescenceEnabled ? percent01(bioluminescence) : 0.0;
    }

    public double maxEnergy() {
        return Math.max(0.0, area) * ENERGY_CAPACITY_PER_AREA;
    }

    public double bioluminescenceEnergyConsumption(YamlConfig.CellProperties config) {
        return bioluminescence01() * Math.max(0.0, config.getCytosolBioluminescenceConsumptionFactor());
    }

    public double energyConsumption(YamlConfig.CellProperties config, double cytosolMass) {
        return cytosolMass * config.getCytosolEnergyConsumptionFactor()
                + bioluminescenceEnergyConsumption(config);
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
        return Math.max(0.0, density) * baseArea * config.getCytosolDensityFactor();
    }

    @Override
    public double area(Cell cell, YamlConfig.CellProperties config) {
        return Math.max(0.0, area) * config.getCytosolAreaFactor()
                + Math.max(0.0, cell.getEnergy()) * config.getEnergyToRadiusFactor();
    }
}
