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
        private double maxSpeedFactor = 10.0;
        private double minTemperatureCelsius = -20.0;
        private double normalTemperatureCelsius = 20.0;
        private double maxTemperatureCelsius = 60.0;
        private boolean scaleSlowdownInsideTick = true;
        private boolean scaleSpeedupInsideTick = false;
    }

    @Getter @Setter
    public static class EnvironmentProperties {
        private double maxViscosity;
        private double maxGravity;
        private double baseMutationChance;
        private double maxMutationChance;
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
    }

    @Getter @Setter
    public static class CollisionProperties {
        private double cellRestitution = 1.0;
        private double deadCellRestitution = 0.05;
        private int maxSubsteps = 8;
        private double maxStepDistance = 4.0;
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
        private double deathEnergy;
        private long deadLifetimeTicks;
        private Control start = new Control();
        private double offsetRange;
    }

    @Getter @Setter
    public static class FoodProperties {
        private double baseRadius;
        private double consumptionRadius;
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
        private Control colorHue = new Control();
        private Control saturation = new Control();
        private Control lightness = new Control();
        private Control maxEnergy = new Control();
        private Control dryMass = new Control();
        private Control elasticity = new Control();
        private MutationDeltas mutation = new MutationDeltas();

        @Getter @Setter
        public static class MutationDeltas {
            private double divisionThreshold;
            private double divisionImpulse;
            private double divisionAngle;
            private double colorHue;
            private double saturation;
            private double lightness;
            private double maxEnergy;
            private double dryMass;
            private double elasticity;
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
    }
}