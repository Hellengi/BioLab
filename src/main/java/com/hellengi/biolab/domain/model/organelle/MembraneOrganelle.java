package com.hellengi.biolab.domain.model.organelle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MembraneOrganelle implements Organelle {
    private double elasticity;
    private boolean melaninEnabled;
    private double melaninPercent;

    public MembraneOrganelle(double elasticity, boolean melaninEnabled, double melaninPercent) {
        this.elasticity = elasticity;
        this.melaninEnabled = melaninEnabled;
        this.melaninPercent = melaninPercent;
    }

    public MembraneOrganelle copy() {
        return new MembraneOrganelle(elasticity, melaninEnabled, melaninPercent);
    }

    public double melanin01() {
        return melaninEnabled ? percent01(melaninPercent) : 0.0;
    }

    public double opacity(YamlConfig.CellProperties config) {
        return clamp01(config.getMembraneBaseOpacity()
                + config.getMembraneMelaninOpacityFactor() * melanin01());
    }

    public double lightTransmittance(YamlConfig.CellProperties config) {
        return Math.exp(-opacity(config));
    }

    public double melaninProtection(YamlConfig.CellProperties config) {
        return clamp01(1.0 - Math.exp(-config.getMembraneMelaninProtectionFactor() * melanin01()));
    }

    public double energyConsumption(YamlConfig.CellProperties config, double membraneLength) {
        return membraneLength * config.getMembraneEnergyConsumptionFactor()
                + melanin01() * config.getMembraneMelaninEnergyConsumptionFactor();
    }

    @Override
    public String code() {
        return "Mb";
    }

    @Override
    public String displayName() {
        return "Membrane";
    }

    @Override
    public boolean present() {
        return true;
    }

    @Override
    public double mass(Cell cell, YamlConfig.CellProperties config) {
        return cell.getMembraneLength() * config.getMembraneMassFactor() * (1.0 + melanin01());
    }

    @Override
    public double area(Cell cell, YamlConfig.CellProperties config) {
        return cell.getMembraneLength() * config.getMembraneAreaFactor();
    }

    private double percent01(double value) {
        if (!Double.isFinite(value)) return 0.0;
        return Math.max(0.0, Math.min(1.0, value / 100.0));
    }

    private double clamp01(double value) {
        if (!Double.isFinite(value)) return 0.0;
        return Math.max(0.0, Math.min(1.0, value));
    }
}
