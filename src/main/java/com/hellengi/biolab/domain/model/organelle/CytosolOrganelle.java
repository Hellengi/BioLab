package com.hellengi.biolab.domain.model.organelle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import lombok.Getter;
import lombok.Setter;
import static com.hellengi.biolab.util.Utils.percent01;

@Getter
@Setter
public class CytosolOrganelle implements Organelle {
    private double maxEnergy;
    private double dryMass;
    private double gfp;

    public CytosolOrganelle(double maxEnergy, double dryMass, double gfp) {
        this.maxEnergy = maxEnergy;
        this.dryMass = dryMass;
        this.gfp = gfp;
    }

    public CytosolOrganelle copy() {
        return new CytosolOrganelle(maxEnergy, dryMass, gfp);
    }

    public double gfp01() {
        return percent01(gfp);
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
        return Math.max(0.0, dryMass) * config.getCytosolMassFactor()
                + Math.max(0.0, cell.getEnergy()) * config.getEnergyToMassFactor();
    }

    @Override
    public double area(Cell cell, YamlConfig.CellProperties config) {
        return Math.max(0.0, dryMass) * config.getCytosolAreaFactor()
                + Math.max(0.0, cell.getEnergy()) * config.getEnergyToRadiusFactor();
    }
}


