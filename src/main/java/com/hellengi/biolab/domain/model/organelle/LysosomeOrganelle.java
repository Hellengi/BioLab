package com.hellengi.biolab.domain.model.organelle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import lombok.Getter;
import lombok.Setter;
import static com.hellengi.biolab.util.Utils.percent01;

@Getter
@Setter
public class LysosomeOrganelle implements Organelle {
    private boolean enabled;
    private double amount;
    private double enzymeActivity;

    public LysosomeOrganelle(boolean enabled, double amount, double enzymeActivity) {
        this.enabled = enabled;
        this.amount = amount;
        this.enzymeActivity = enzymeActivity;
    }

    public LysosomeOrganelle copy() {
        return new LysosomeOrganelle(enabled, amount, enzymeActivity);
    }

    public int activeAmount() {
        return present() ? Math.min(6, Math.max(0, (int) Math.round(amount))) : 0;
    }

    public double enzymeActivity01() {
        return Math.max(0.15, percent01(enzymeActivity));
    }

    public double totalMass(YamlConfig.CellProperties config) {
        return activeAmount() * config.getLysosomeMassFactor();
    }

    public double totalArea(YamlConfig.CellProperties config) {
        return activeAmount() * config.getLysosomeAreaFactor();
    }

    public double energyConsumption(YamlConfig.CellProperties config) {
        double enzyme = enzymeActivity01();
        return activeAmount()
                * config.getLysosomeEnergyConsumptionFactor()
                * (0.84 + 0.16 * enzyme);
    }

    public double divisionEnergyCost(YamlConfig.CellProperties config) {
        double enzyme = enzymeActivity01();
        return activeAmount()
                * config.getLysosomeDivEnergyCostFactor()
                * (0.80 + 0.20 * enzyme);
    }

    @Override
    public String code() {
        return "Ly";
    }

    @Override
    public String displayName() {
        return "Lysosome";
    }

    @Override
    public boolean present() {
        return enabled && Math.round(amount) > 0;
    }

    @Override
    public double mass(Cell cell, YamlConfig.CellProperties config) {
        return totalMass(config);
    }

    @Override
    public double area(Cell cell, YamlConfig.CellProperties config) {
        return totalArea(config);
    }
}




