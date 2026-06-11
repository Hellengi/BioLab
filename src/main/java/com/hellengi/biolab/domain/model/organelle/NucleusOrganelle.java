

package com.hellengi.biolab.domain.model.organelle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import lombok.Getter;
import lombok.Setter;

import static com.hellengi.biolab.util.Utils.EPSILON;
import static com.hellengi.biolab.util.Utils.clamp01;

@Getter
@Setter
public class NucleusOrganelle implements Organelle {
    private double divisionThreshold;
    private double divisionImpulse;
    private double divisionAngle;

    public NucleusOrganelle(double divisionThreshold, double divisionImpulse, double divisionAngle) {
        this.divisionThreshold = divisionThreshold;
        this.divisionImpulse = divisionImpulse;
        this.divisionAngle = divisionAngle;
    }

    public NucleusOrganelle copy() {
        return new NucleusOrganelle(divisionThreshold, divisionImpulse, divisionAngle);
    }

    public double divisionImpulseCost(Cell cell) {
        return divisionImpulse * divisionImpulse / Math.max(2.0 * cell.getMass(), EPSILON);
    }

    public double divisionEnergyThreshold(Cell cell) {
        double percent = Double.isFinite(divisionThreshold) ? divisionThreshold : 100.0;
        return Math.max(0.0, cell.getMaxEnergy()) * clamp01(percent / 100.0);
    }

    @Override
    public String code() {
        return "Nc";
    }

    @Override
    public String displayName() {
        return "Nucleus";
    }

    @Override
    public boolean present() {
        return true;
    }

    @Override
    public double mass(Cell cell, YamlConfig.CellProperties config) {
        return area(cell, config) * config.getNucleoidDensityFactor();
    }

    @Override
    public double area(Cell cell, YamlConfig.CellProperties config) {
        return config.getNucleoidAreaFactor();
    }
}
