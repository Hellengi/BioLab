package com.hellengi.biolab.domain.model.organelle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import lombok.Getter;
import lombok.Setter;

import static com.hellengi.biolab.util.Utils.EPSILON;
import static com.hellengi.biolab.util.Utils.clamp01;
import static com.hellengi.biolab.util.Utils.percent01;

@Getter
@Setter
public class ChloroplastsOrganelle implements Organelle {
    private static final double MIN_CHLOROPHYLL_PERCENT = 15.0;

    private boolean enabled;
    private double amount;
    private double chlorophyll;
    private double carotenoids;

    public ChloroplastsOrganelle(boolean enabled, double amount, double chlorophyll, double carotenoids) {
        this.enabled = enabled;
        this.amount = amount;
        this.chlorophyll = chlorophyll;
        this.carotenoids = carotenoids;
    }

    public ChloroplastsOrganelle copy() {
        return new ChloroplastsOrganelle(enabled, amount, chlorophyll, carotenoids);
    }

    public double activeAmount() {
        return present() ? Math.max(0.0, amount) : 0.0;
    }

    public double chlorophyll01() {
        if (!present()) {
            return 0.0;
        }
        return percent01(Math.max(MIN_CHLOROPHYLL_PERCENT, chlorophyll));
    }

    public double carotenoids01() {
        return percent01(carotenoids);
    }

    public double totalMass(YamlConfig.CellProperties config) {
        return activeAmount() * config.getChloroplastMassFactor();
    }

    public double totalArea(YamlConfig.CellProperties config) {
        return activeAmount() * config.getChloroplastAreaFactor();
    }

    public double energyConsumption(YamlConfig.CellProperties config) {
        return activeAmount() * config.getChloroplastEnergyConsumptionFactor()
                * (1.0 + chlorophyll01() + carotenoids01());
    }

    public double divisionEnergyCost(YamlConfig.CellProperties config) {
        return activeAmount() * config.getChloroplastDivEnergyCostFactor()
                * (1.0 + chlorophyll01() + carotenoids01());
    }

    public double pigmentOpticalDepth(Cell cell, YamlConfig.CellProperties config) {
        if (!present()) return 0.0;
        double coverage = clamp01(totalArea(config) / Math.max(cell.getCellArea(), EPSILON));
        return coverage * (config.getChlorophyllAbsorbFactor() * chlorophyll01()
                + config.getCarotenoidAbsorbFactor() * carotenoids01());
    }

    public double lightCapture(Cell cell, YamlConfig.CellProperties config) {
        return present() ? 1.0 - Math.exp(-pigmentOpticalDepth(cell, config)) : 0.0;
    }

    public double chlorophyllLightShare(YamlConfig.CellProperties config) {
        double chlor = config.getChlorophyllAbsorbFactor() * chlorophyll01();
        double carot = config.getCarotenoidAbsorbFactor() * carotenoids01();
        return chlor / Math.max(chlor + carot, EPSILON);
    }

    public double capturedLight(Cell cell, YamlConfig.CellProperties config, double irradiance) {
        if (!present()) return 0.0;
        double antennaCrossSection = Math.sqrt(Math.max(totalArea(config), EPSILON));
        return Math.max(0.0, irradiance)
                * cell.getMembraneLightTransmittance()
                * lightCapture(cell, config)
                * antennaCrossSection;
    }

    public double photochemicalLight(Cell cell, YamlConfig.CellProperties config, double irradiance) {
        return capturedLight(cell, config, irradiance) * chlorophyllLightShare(config);
    }

    public double photosynthesisCapacity(YamlConfig.CellProperties config, double cpDamage) {
        if (!present()) return 0.0;
        return activeAmount()
                * config.getChloroplastAreaFactor()
                * chlorophyll01()
                * config.getMaxPhotosynthesisFactor()
                * Math.exp(-cpDamage);
    }

    public double usefulLight(Cell cell, YamlConfig.CellProperties config, double irradiance, double cpDamage) {
        return Math.min(photochemicalLight(cell, config, irradiance), photosynthesisCapacity(config, cpDamage));
    }

    public double excessLight(Cell cell, YamlConfig.CellProperties config, double irradiance, double cpDamage) {
        return Math.max(0.0, photochemicalLight(cell, config, irradiance) - photosynthesisCapacity(config, cpDamage));
    }

    public double carotProtection(YamlConfig.CellProperties config) {
        if (!present()) return 0.0;
        return clamp01(1.0 - Math.exp(
                -config.getCarotenoidProtectionFactor()
                        * carotenoids01()
                        / Math.max(chlorophyll01(), EPSILON)
        ));
    }

    public double photoDamageRate(Cell cell, YamlConfig.CellProperties config, double irradiance, double cpDamage) {
        if (!present()) return 0.0;
        double capacity = photosynthesisCapacity(config, cpDamage);
        double excess = excessLight(cell, config, irradiance, cpDamage);
        double stress = excess / Math.max(capacity, EPSILON);
        return config.getCpPhotoDamageFactor() * stress * stress * (1.0 - carotProtection(config));
    }

    @Override
    public String code() {
        return "Cp";
    }

    @Override
    public String displayName() {
        return "Chloroplasts";
    }

    @Override
    public boolean present() {
        return enabled && amount > 0.0;
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



