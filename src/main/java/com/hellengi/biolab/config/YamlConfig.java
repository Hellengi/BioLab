
package com.hellengi.biolab.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Setter
@Getter
@ConfigurationProperties(prefix = "simulation")
public class YamlConfig {
    private long tickRateMs;
    private int broadcastFps;
    private int diameter;

    private TimeProperties time = new TimeProperties();
    private EnvironmentProperties environment = new EnvironmentProperties();
    private LightProperties light = new LightProperties();
    private CollisionProperties collision = new CollisionProperties();
    private CellProperties cell = new CellProperties();
    private FoodProperties food = new FoodProperties();
    private ControlsProperties controls = new ControlsProperties();
    private GenomeProperties genome = new GenomeProperties();
    private MotionProperties motion = new MotionProperties();

    public int getTubeDiameter() {
        return diameter;
    }

    public double worldCenterX() {
        return diameter / 2.0;
    }

    public double worldCenterY() {
        return diameter / 2.0;
    }

    public double worldRadius() {
        return diameter / 2.0;
    }

    @Getter @Setter
    public static class TimeProperties {
        private double minSpeedFactor = 0.01;
        private double maxSpeedFactor = 100.0;
        private double minTemperatureCelsius = -20.0;
        private double normalTemperatureCelsius = 20.0;
        private double maxTemperatureCelsius = 60.0;
    }

    @Getter @Setter
    public static class EnvironmentProperties {
        private double maxViscosity;
        private double maxGravity;
        private double baseMutationChance;
        private double maxMutationChance;
        private double rareMutationChance = 0.006;
        private double mediumDensity = 1.0;
        private double buoyancyStrength = 1.0;
    }

    @Getter @Setter
    public static class LightProperties {
        private double maxTurbidityAttenuation = 0.018;
        private boolean globalCycleEnabled = false;
        private boolean localSourcesEnabled = false;
        private double orbitSpeedMaxRadiansPerTick = 0.01;
        private double falloffFactor = 300.0;
        private int gridStep = 8;
        private double cellBioluminescenceMaxBrightness = 0.18;
        private double bioluminescenceEnergyToLightFactor = 3.0;
        private double scatteringAlbedo = 0.48;
        private double scatteredLightRadiusGridCells = 6.0;
    }

    @Getter @Setter
    public static class CollisionProperties {
        private double cellRestitution = 1.0;
        private double deadCellRestitution = 0.05;
        private double positionSlop = 0.01;
        private double correctionPercent = 0.8;
    }

    @Getter @Setter
    public static class CellProperties {
        private double baseRadius;
        private double startEnergy;
        private double energyToMassFactor;
        private double energyToRadiusFactor;
        private double energyToDivisionImpulseFactor;
        private double energyDecayPerTick;
        private double lowEnergyThreshold = 10.0;
        private long deadLifetimeTicks;
        private Control start = new Control();
        private double offsetRange;

        private double nucleoidDensityFactor = 1.10;
        private double nucleoidAreaFactor = 18.0;
        private double nucleoidEnergyConsumption = 0.012;
        private double nucleoidDivEnergyCost = 5.0;

        private double cytosolDensityFactor = 1.0;
        private double cytosolAreaFactor = 0.58;
        private double cytosolEnergyConsumptionFactor = 0.0007;
        private double cytosolDivEnergyCostFactor = 0.02;
        private double cytosolBioluminescenceConsumptionFactor = 0.04;
        private double cytosolColorWeight = 1.0;

        private double membraneDensityFactor = 1.05;
        private double membraneAreaFactor = 0.32;
        private double membraneEnergyConsumptionFactor = 0.0012;
        private double membraneDivEnergyCostFactor = 0.025;
        private double membraneBaseOpacity = 0.095;
        private double membraneMelaninOpacityFactor = 0.42;
        private double membraneMelaninProtectionFactor = 3.2;
        private double membraneMelaninEnergyConsumptionFactor = 0.003;

        private double chloroplastDensityFactor = 1.15;
        private double chloroplastAreaFactor = 4.0;
        private double chloroplastEnergyConsumptionFactor = 0.0014;
        private double chloroplastDivEnergyCostFactor = 0.12;
        private double chlorophyllAbsorbFactor = 2.4;
        private double carotenoidAbsorbFactor = 0.42;
        private double carotenoidProtectionFactor = 2.8;
        private double maxPhotosynthesisFactor = 0.12;
        private double photosynthesisEnergyYield = 0.82;
        private double cpPhotoDamageFactor = 0.0015;
        private double cpDamageLeakThreshold = 0.55;
        private double cpDamageLeakFactor = 0.006;

        private double lysosomeDensityFactor = 1.10;
        private double lysosomeAreaFactor = 4.7;
        private double lysosomeEnergyConsumptionFactor = 0.006;
        private double lysosomeDivEnergyCostFactor = 0.09;
        private double lysosomeDigestRateFactor = 0.85;
        private double lysosomeBaseDigestYield = 1.0;
        private double lysosomeDigestCostFactor = 0.085;
        private double lysosomeTransportSpeedFactor = 0.78;
        private double lysosomeLeakThreshold = 0.55;
        private double lysosomeLeakDamageFactor = 0.006;
        private double lysosomeCaptureDamageThreshold = 0.65;
        private double lysosomeRepairShare = 0.20;
        private double lysosomeRepairEnergyCost = 1.2;

        private double flagellumDensityFactor = 1.05;
        private double flagellumAreaFactor = 0.75;
        private double flagellumDivEnergyCostFactor = 0.05;
        private double flagellumBaseThrustFactor = 0.045;
        private double flagellumEnergyCostFactor = 0.018;
        private double flagellumLengthToRadiusFactor = 2.35;
        private double flagellumRepairShare = 0.10;
        private double flagellumRepairEnergyCost = 1.35;
        private double membraneRepairShare = 0.16;
        private double membraneRepairEnergyCost = 1.8;

        private double baseCellOpacity = 0.12;
        private double pigmentCellOpacityFactor = 0.22;
        private double cellPhotoDamageFactor = 0.0007;
        private double cellDeathDamageThreshold = 1.0;
        private double cellDivDamageMax = 0.35;
        private double repairCapacityFactor = 0.004;
        private double cpRepairShare = 0.62;
        private double cellRepairShare = 0.38;
        private double cpRepairEnergyCost = 1.4;
        private double cellRepairEnergyCost = 2.2;
        private double divDamageTransferFactor = 0.5;
        private double deadCellFoodEnergyPerMass = 0.08;
        private int deadCellFoodMinPieces = 3;
        private int deadCellFoodMaxPieces = 7;
        private double deadCellFoodScatterRadiusFactor = 0.8;
    }

    @Getter @Setter
    public static class FoodProperties {
        private double baseRadius;
        private double maxSpawnMultiplier;
        private double minEnergy;
        private double maxEnergy;
        private int start;
    }

    @Getter @Setter
    public static class ControlsProperties {
        private Control time = new Control();
        private Control foodSpawnIntensity = new Control();
        private Control viscosity = new Control();
        private Control gravity = new Control();
        private Control radiation = new Control();
        private Control globalLight = new Control();
        private Control turbidity = new Control();
        private Control globalLightCycleMin = new Control();
        private Control globalLightCyclePeriod = new Control();
        private Control lightSourceCount = new Control();
        private Control lightSourceStartAngle = new Control();
        private Control lightSourceBrightness = new Control();
        private Control lightSourceOrbitRadius = new Control();
        private Control lightSourceOrbitSpeed = new Control();
    }

    @Getter @Setter
    public static class GenomeProperties {
        private Control divisionThreshold = new Control();
        private Control divisionImpulse = new Control();
        private Control divisionAngle = new Control();
        private Control startNucleusDamage = new Control();
        private Control startCytosolDamage = new Control();
        private Control startCpDamage = new Control();
        private Control startMembraneDamage = new Control();
        private Control startLysosomeDamage = new Control();
        private Control startFlagellumDamage = new Control();
        private Control cytosolArea = new Control();
        private Control cytosolDensity = new Control();
        private Control elasticity = new Control();
        private boolean bioluminescenceEnabledInitial = false;
        private Control bioluminescence = new Control();
        private boolean melaninEnabledInitial = false;
        private Control melaninPercent = new Control();
        private boolean chloroplastEnabledInitial = true;
        private Control chloroplastAmount = new Control();
        private Control chlorophyll = new Control();
        private Control carotenoids = new Control();
        private boolean lysosomeEnabledInitial = true;
        private Control lysosomeAmount = new Control();
        private Control lysosomeEnzymeActivity = new Control();
        private boolean flagellumEnabledInitial = false;
        private Control flagellumCount = new Control();
        private Control flagellumLength = new Control();
        private Control flagellumMotorPower = new Control();
        private Control flagellumPairSpreadAngle = new Control();
        private Control flagellumSteeringAsymmetry = new Control();
        private MutationDeltas mutation = new MutationDeltas();

        @Getter @Setter
        public static class MutationDeltas {
            private double divisionThreshold;
            private double divisionImpulse;
            private double divisionAngle;
            private double cytosolArea;
            private double cytosolDensity;
            private double elasticity;
            private double bioluminescence;
            private double melaninPercent;
            private double chloroplastAmount;
            private double chlorophyll;
            private double carotenoids;
            private double lysosomeAmount;
            private double lysosomeEnzymeActivity;
            private double flagellumLength;
            private double flagellumMotorPower;
            private double flagellumPairSpreadAngle;
            private double flagellumSteeringAsymmetry;
        }
    }

    @Getter @Setter
    public static class MotionProperties {
        private Control cellSpeed = new Control();
        private Control cellDirection = new Control();
    }

    @Getter @Setter
    public static class Control {
        private double initial;
        private double min;
        private double max;
        private double step = 1.0;
        /**
         * UI/probability mapping for this numeric value. Supported values:
         * linear, logarithmic. Linear remains the default for ordinary controls.
         */
        private String scale = "linear";
    }
}
