package com.hellengi.biolab.config;

import lombok.Setter;
import lombok.Getter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Setter
@Getter
@ConfigurationProperties(prefix = "simulation")
public class YamlConfig {
    private int width, height;
    private long tickRateMs;

    private CellProperties cell = new CellProperties();
    private FoodProperties food = new FoodProperties();
    private SpawnProperties spawn = new SpawnProperties();
    private GenomeProperties genome = new GenomeProperties();
    private RenderProperties render = new RenderProperties();
    private PhysicsProperties physics = new PhysicsProperties();
    private TimeProperties time = new TimeProperties();
    private BroadcastProperties broadcast = new BroadcastProperties();

    @Getter @Setter
    public static class CellProperties {
        private int initialCount;
        private double energyMin, energyRange, minEnergy;
        private double energyDecay, viscosity;
        private long deadLifetimeTicks;
    }

    @Getter @Setter
    public static class FoodProperties {
        private int initialCount;
        private int spawnIntensity;
        private double spawnMaxMultiplier;
        private double energyMin, energyRange, consumptionRadius;
    }

    @Getter @Setter
    public static class SpawnProperties {
        private double centerX, centerY, offsetRange;
        private double divisionImpulseCost, minChildEnergy;
    }

    @Getter @Setter
    public static class GenomeProperties {
        private double radiationChance;
        private InitialGenome initial = new InitialGenome();
        private MutationDeltas mutation = new MutationDeltas();
        private GenomeLimits limits = new GenomeLimits();

        @Getter @Setter
        public static class InitialGenome {
            private double divisionThreshold, divisionImpulse;
            private double colorHue, saturation, lightness, maxEnergy;
        }

        @Getter @Setter
        public static class MutationDeltas {
            private double divisionThreshold, divisionImpulse;
            private double colorHue, saturation, lightness, maxEnergy;
        }

        @Getter @Setter
        public static class GenomeLimits {
            private Range divisionThreshold = new Range();
            private Range divisionImpulse = new Range();
            private Range colorHue = new Range();
            private Range saturation = new Range();
            private Range lightness = new Range();
            private Range maxEnergy = new Range();
        }
    }

    @Getter @Setter
    public static class RenderProperties {
        private double cellBaseRadius, cellRadiusScale;
        private double directionVectorLength, foodBaseRadius;
    }

    @Getter @Setter
    public static class Range {
        private double min, max;
    }

    @Getter @Setter
    public static class PhysicsProperties {
        private double collisionRestitution = 1.0;
        private int maxCollisionSubsteps = 8;
        private double maxCollisionStepDistance = 4.0;
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
    public static class BroadcastProperties {
        private int fps = 100;
    }
}