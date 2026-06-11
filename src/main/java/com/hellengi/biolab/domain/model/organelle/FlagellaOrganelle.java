
package com.hellengi.biolab.domain.model.organelle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import lombok.Getter;
import lombok.Setter;

import static com.hellengi.biolab.util.Utils.clamp01;
import static com.hellengi.biolab.util.Utils.percent01;

@Getter
@Setter
public class FlagellaOrganelle implements Organelle {
    public static final int MAX_FLAGELLA = 2;

    private static final double DEFAULT_MIN_LENGTH_TO_RADIUS = 1.0;
    private static final double MIN_VISUAL_ROOT_HALF_WIDTH_TO_RADIUS = 0.050;
    private static final double MAX_VISUAL_ROOT_HALF_WIDTH_TO_RADIUS = 0.112;
    private static final double ROOT_WIDTH_ENVELOPE_MULTIPLIER = 1.10;
    private static final double LENGTH_TO_THICKNESS_RESPONSE = 0.82;
    private static final double PAIR_THICKNESS_SCALE = 0.92;
    private static final double MAX_PAIR_SPREAD_ANGLE_DEGREES = 180.0;
    private static final double STEERING_POWER_SHARE = 0.45;
    private static final double MIN_LOCAL_ACTIVITY_MULTIPLIER = 0.15;
    private static final double MAX_LOCAL_ACTIVITY_MULTIPLIER = 1.85;

    private boolean enabled;
    private int count;
    /** Actual flagellum length as a share of current cell radius. */
    private double length;
    /** Relative motor activity, stored as 0..100%. */
    private double motorPower;
    /** Symmetric spacing between paired flagella in degrees. Ignored for a single flagellum. */
    private double pairSpreadAngle;
    /** Signed left/right motor bias, stored as -100..100%. */
    private double steeringAsymmetry;

    public FlagellaOrganelle(
            boolean enabled,
            double count,
            double length,
            double motorPower,
            double pairSpreadAngle,
            double steeringAsymmetry
    ) {
        this.enabled = enabled;
        this.count = normalizeCount(count);
        this.length = finiteOr(length, 1.8);
        this.motorPower = clampPercent(motorPower);
        this.pairSpreadAngle = clampPairSpread(pairSpreadAngle, this.length);
        this.steeringAsymmetry = clampSignedPercent(steeringAsymmetry);
    }

    public FlagellaOrganelle copy() {
        return new FlagellaOrganelle(
                enabled,
                count,
                length,
                motorPower,
                pairSpreadAngle,
                steeringAsymmetry
        );
    }

    public int activeAmount() {
        return present() ? Math.min(MAX_FLAGELLA, Math.max(1, count)) : 0;
    }

    public double length01(YamlConfig.CellProperties config) {
        double min = minLengthToRadiusFactor(config);
        double max = Math.max(min, config.getFlagellumLengthToRadiusFactor());
        return clamp01((lengthToRadiusFactor(config) - min) / Math.max(1.0e-9, max - min));
    }

    public double motorPower01() {
        return clamp01(percent01(motorPower));
    }

    public double steeringAsymmetry01() {
        return Math.max(-1.0, Math.min(1.0, steeringAsymmetry / 100.0));
    }


    /**
     * PairSpreadAngle is an extra spacing control: 0 means the two visible root
     * envelopes just touch, while 180 reaches the widest placement that still
     * keeps the rendered roots inside the membrane. The root thickness is folded
     * into this method so UI and backend do not need hidden offsets.
     */
    public double pairSpreadRadians(YamlConfig.CellProperties config) {
        double lengthFactor = lengthToRadiusFactor(config);
        double minimum = minimumPairRootCenterSeparationRadians(lengthFactor);
        double t = clamp01(finiteOr(pairSpreadAngle, 0.0) / MAX_PAIR_SPREAD_ANGLE_DEGREES);
        double maximum = maximumPairRootCenterSeparationRadians(lengthFactor);
        return minimum + (maximum - minimum) * t;
    }

    public double lengthToRadiusFactor(YamlConfig.CellProperties config) {
        double min = minLengthToRadiusFactor(config);
        double max = Math.max(min, config.getFlagellumLengthToRadiusFactor());
        double raw = finiteOr(length, min);
        // Backward compatibility for old 0..100 genomes saved before length became a factual ratio.
        if (raw > max * 2.0) {
            raw = min + (max - min) * clamp01(raw / 100.0);
        }
        return Math.max(min, Math.min(max, raw));
    }

    public double localLengthToRadiusFactor(int index, YamlConfig.CellProperties config) {
        return lengthToRadiusFactor(config);
    }

    /**
     * Rendered root half-width of the flagellum as a share of cell radius. The
     * real axoneme is much thinner, but this includes the visible membrane
     * sheath/contrast envelope used by the simulation so flagella remain legible.
     */
    public double thicknessToRadiusFactor(YamlConfig.CellProperties config) {
        return visualRootWidthToRadiusFactor(lengthToRadiusFactor(config));
    }

    public double localActivity01(int index) {
        return clamp01(motorPower01() * localActivityMultiplier(index));
    }

    public double localActivityMultiplier(int index) {
        int amount = activeAmount();
        if (amount <= 1) return 1.0;
        double side = index == 0 ? -1.0 : 1.0;
        double bias = 1.0 + side * steeringAsymmetry01() * STEERING_POWER_SHARE;
        return Math.max(MIN_LOCAL_ACTIVITY_MULTIPLIER, Math.min(MAX_LOCAL_ACTIVITY_MULTIPLIER, bias));
    }

    public double attachmentOffsetRadians(int index, YamlConfig.CellProperties config) {
        int amount = activeAmount();
        // Eukaryotic flagella in this simulation are fixed as posterior pushers.
        // Paired flagella are placed symmetrically around the rear pole.
        double rear = Math.PI;
        if (amount <= 1) return rear;
        double side = index == 0 ? -0.5 : 0.5;
        return normalizeSignedRadians(rear + side * pairSpreadRadians(config));
    }

    public double orientationOffsetRadians(int index) {
        double steering = steeringAsymmetry01();
        if (activeAmount() > 1) {
            // Paired flagella steer mainly by differential motor power, not by constantly changing their thrust vector.
            return 0.0;
        }
        return normalizeSignedRadians(steering * Math.toRadians(28.0));
    }

    public double averageMotorPower01() {
        int amount = activeAmount();
        if (amount <= 0) return 0.0;
        double sum = 0.0;
        for (int i = 0; i < amount; i++) sum += localActivity01(i);
        return sum / amount;
    }

    public double totalMass(YamlConfig.CellProperties config) {
        return totalArea(config) * config.getFlagellumDensityFactor();
    }

    public double totalArea(YamlConfig.CellProperties config) {
        return activeAmount()
                * config.getFlagellumAreaFactor()
                * lengthToRadiusFactor(config)
                * normalizedThicknessForCost(config);
    }

    public double divisionEnergyCost(YamlConfig.CellProperties config) {
        return totalMass(config) * config.getFlagellumDivEnergyCostFactor();
    }

    private double normalizedThicknessForCost(YamlConfig.CellProperties config) {
        // Keep cost tied to the conservative physical core, not to the exaggerated
        // visual root width needed for readability.
        return 1.0;
    }

    private double minLengthToRadiusFactor(YamlConfig.CellProperties config) {
        return Math.max(0.02, Math.min(DEFAULT_MIN_LENGTH_TO_RADIUS, Math.max(0.02, config.getFlagellumLengthToRadiusFactor())));
    }

    private int normalizeCount(double raw) {
        if (!Double.isFinite(raw)) return 1;
        return Math.min(MAX_FLAGELLA, Math.max(1, (int) Math.round(raw)));
    }

    private double clampPercent(double value) {
        if (!Double.isFinite(value)) return 0.0;
        return Math.max(0.0, Math.min(100.0, value));
    }

    private double clampSignedPercent(double value) {
        if (!Double.isFinite(value)) return 0.0;
        return Math.max(-100.0, Math.min(100.0, value));
    }

    private double clampPairSpread(double value, double lengthFactor) {
        if (!Double.isFinite(value)) return 36.0;
        return Math.max(0.0, Math.min(MAX_PAIR_SPREAD_ANGLE_DEGREES, value));
    }

    public void setLength(double length) {
        this.length = finiteOr(length, 1.8);
        this.pairSpreadAngle = clampPairSpread(pairSpreadAngle, this.length);
    }

    public void setPairSpreadAngle(double pairSpreadAngle) {
        this.pairSpreadAngle = clampPairSpread(pairSpreadAngle, this.length);
    }

    private double visualRootWidthToRadiusFactor(double lengthFactor) {
        double t = clamp01((finiteOr(lengthFactor, 1.8) - DEFAULT_MIN_LENGTH_TO_RADIUS) / 3.0);
        double thickness = MAX_VISUAL_ROOT_HALF_WIDTH_TO_RADIUS
                - (MAX_VISUAL_ROOT_HALF_WIDTH_TO_RADIUS - MIN_VISUAL_ROOT_HALF_WIDTH_TO_RADIUS)
                * Math.pow(t, Math.max(0.05, LENGTH_TO_THICKNESS_RESPONSE));
        if (activeAmount() >= 2) {
            thickness *= PAIR_THICKNESS_SCALE;
        }
        return thickness;
    }

    private double minimumPairRootCenterSeparationRadians(double lengthFactor) {
        double rootHalfWidth = visualRootWidthToRadiusFactor(lengthFactor) * ROOT_WIDTH_ENVELOPE_MULTIPLIER;
        return 2.0 * Math.asin(Math.max(0.0, Math.min(0.95, rootHalfWidth)));
    }

    private double maximumPairRootCenterSeparationRadians(double lengthFactor) {
        double rootHalfWidth = visualRootWidthToRadiusFactor(lengthFactor) * ROOT_WIDTH_ENVELOPE_MULTIPLIER;
        double edgeMargin = 2.0 * Math.asin(Math.max(0.0, Math.min(0.95, rootHalfWidth)));
        return Math.max(minimumPairRootCenterSeparationRadians(lengthFactor), Math.PI - edgeMargin);
    }

    private double finiteOr(double value, double fallback) {
        return Double.isFinite(value) ? value : fallback;
    }


    private double normalizeSignedRadians(double value) {
        double twoPi = Math.PI * 2.0;
        double result = value % twoPi;
        if (result <= -Math.PI) result += twoPi;
        if (result > Math.PI) result -= twoPi;
        return result;
    }

    @Override
    public String code() {
        return "Fl";
    }

    @Override
    public String displayName() {
        return "Flagella";
    }

    @Override
    public boolean present() {
        return enabled && count > 0;
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
