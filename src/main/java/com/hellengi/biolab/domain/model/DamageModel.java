package com.hellengi.biolab.domain.model;

import com.hellengi.biolab.config.YamlConfig;

import static com.hellengi.biolab.util.Utils.clamp01;

/**
 * Shared rules for organelle damage effects.
 *
 * Keep generic damage mechanics here so adding a future organelle does not
 * require copying one-off formulas for performance, leakage, or division
 * inheritance across lifecycle classes.
 */
public final class DamageModel {
    private DamageModel() {
    }

    public static double performance(double damage) {
        return Math.exp(-Math.max(0.0, finite(damage)));
    }

    public static double inheritedDamage(double parentDamage, YamlConfig.CellProperties config) {
        return clamp01(finite(parentDamage) * Math.max(0.0, config.getDivDamageTransferFactor()));
    }

    public static double leakDamageRate(double damage, double threshold, double factor) {
        return leakDamageRate(damage, threshold, factor, 1.0);
    }

    public static double leakDamageRate(double damage, double threshold, double factor, double multiplier) {
        double leak = Math.max(0.0, finite(damage) - Math.max(0.0, finite(threshold)));
        if (leak <= 0.0) return 0.0;
        return Math.max(0.0, finite(factor))
                * Math.max(0.0, finite(multiplier))
                * leak
                * (1.0 + leak);
    }

    public static double finite(double value) {
        return Double.isFinite(value) ? value : 0.0;
    }
}
