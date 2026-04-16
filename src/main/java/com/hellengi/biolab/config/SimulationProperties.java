package com.hellengi.biolab.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "simulation")
public class SimulationProperties {

    private int worldWidth;
    private int worldHeight;
    private long simulationTickRateMs;

    private int initialSaprotrophCount;
    private int initialFoodCount;
    private int foodGenerationIntensity;
    private double foodGenerationMaxFrequencyMultiplier;

    private double foodEnergyMin;
    private double foodEnergyRange;
    private double foodConsumptionRadius;

    private double initialSaprotrophEnergyMin;
    private double initialSaprotrophEnergyRange;

    private double minCellEnergy;
    private double saprotrophBaseEnergyDecayPerTick;
    private double cellViscosityFactor;

    private long deadCellLifetimeTicks;

    private double initialSpawnCenterX;
    private double initialSpawnCenterY;
    private double initialSpawnOffsetRange;

    private double clientSaprotrophBaseRadius;
    private double clientSaprotrophRadiusScale;
    private double clientDirectionVectorLength;
    private double clientFoodRadiusAtMinEnergy;

    private double divisionImpulseEnergyCostFactor;
    private double minChildEnergyAfterDivision;

    private GenomeProperties genome = new GenomeProperties();

    public static class GenomeProperties {
        private double initialDivisionThreshold;
        private double initialDivisionImpulseStrength;
        private double initialColorHue;
        private double initialLightness;
        private double initialMaxEnergy;

        private double radiationMutationChance;

        private double divisionThresholdMutationDelta;
        private double divisionImpulseMutationDelta;
        private double colorHueMutationDelta;
        private double lightnessMutationDelta;
        private double maxEnergyMutationDelta;

        private double divisionThresholdMin;
        private double divisionThresholdMax;

        private double divisionImpulseMin;
        private double divisionImpulseMax;

        private double colorHueMin;
        private double colorHueMax;

        private double lightnessMin;
        private double lightnessMax;

        private double maxEnergyMin;
        private double maxEnergyMax;

        public double getInitialDivisionThreshold() {
            return initialDivisionThreshold;
        }

        public void setInitialDivisionThreshold(double initialDivisionThreshold) {
            this.initialDivisionThreshold = initialDivisionThreshold;
        }

        public double getInitialDivisionImpulseStrength() {
            return initialDivisionImpulseStrength;
        }

        public void setInitialDivisionImpulseStrength(double initialDivisionImpulseStrength) {
            this.initialDivisionImpulseStrength = initialDivisionImpulseStrength;
        }

        public double getInitialColorHue() {
            return initialColorHue;
        }

        public void setInitialColorHue(double initialColorHue) {
            this.initialColorHue = initialColorHue;
        }

        public double getInitialLightness() {
            return initialLightness;
        }

        public void setInitialLightness(double initialLightness) {
            this.initialLightness = initialLightness;
        }

        public double getInitialMaxEnergy() {
            return initialMaxEnergy;
        }

        public void setInitialMaxEnergy(double initialMaxEnergy) {
            this.initialMaxEnergy = initialMaxEnergy;
        }

        public double getRadiationMutationChance() {
            return radiationMutationChance;
        }

        public void setRadiationMutationChance(double radiationMutationChance) {
            this.radiationMutationChance = radiationMutationChance;
        }

        public double getDivisionThresholdMutationDelta() {
            return divisionThresholdMutationDelta;
        }

        public void setDivisionThresholdMutationDelta(double divisionThresholdMutationDelta) {
            this.divisionThresholdMutationDelta = divisionThresholdMutationDelta;
        }

        public double getDivisionImpulseMutationDelta() {
            return divisionImpulseMutationDelta;
        }

        public void setDivisionImpulseMutationDelta(double divisionImpulseMutationDelta) {
            this.divisionImpulseMutationDelta = divisionImpulseMutationDelta;
        }

        public double getColorHueMutationDelta() {
            return colorHueMutationDelta;
        }

        public void setColorHueMutationDelta(double colorHueMutationDelta) {
            this.colorHueMutationDelta = colorHueMutationDelta;
        }

        public double getLightnessMutationDelta() {
            return lightnessMutationDelta;
        }

        public void setLightnessMutationDelta(double lightnessMutationDelta) {
            this.lightnessMutationDelta = lightnessMutationDelta;
        }

        public double getMaxEnergyMutationDelta() {
            return maxEnergyMutationDelta;
        }

        public void setMaxEnergyMutationDelta(double maxEnergyMutationDelta) {
            this.maxEnergyMutationDelta = maxEnergyMutationDelta;
        }

        public double getDivisionThresholdMin() {
            return divisionThresholdMin;
        }

        public void setDivisionThresholdMin(double divisionThresholdMin) {
            this.divisionThresholdMin = divisionThresholdMin;
        }

        public double getDivisionThresholdMax() {
            return divisionThresholdMax;
        }

        public void setDivisionThresholdMax(double divisionThresholdMax) {
            this.divisionThresholdMax = divisionThresholdMax;
        }

        public double getDivisionImpulseMin() {
            return divisionImpulseMin;
        }

        public void setDivisionImpulseMin(double divisionImpulseMin) {
            this.divisionImpulseMin = divisionImpulseMin;
        }

        public double getDivisionImpulseMax() {
            return divisionImpulseMax;
        }

        public void setDivisionImpulseMax(double divisionImpulseMax) {
            this.divisionImpulseMax = divisionImpulseMax;
        }

        public double getColorHueMin() {
            return colorHueMin;
        }

        public void setColorHueMin(double colorHueMin) {
            this.colorHueMin = colorHueMin;
        }

        public double getColorHueMax() {
            return colorHueMax;
        }

        public void setColorHueMax(double colorHueMax) {
            this.colorHueMax = colorHueMax;
        }

        public double getLightnessMin() {
            return lightnessMin;
        }

        public void setLightnessMin(double lightnessMin) {
            this.lightnessMin = lightnessMin;
        }

        public double getLightnessMax() {
            return lightnessMax;
        }

        public void setLightnessMax(double lightnessMax) {
            this.lightnessMax = lightnessMax;
        }

        public double getMaxEnergyMin() {
            return maxEnergyMin;
        }

        public void setMaxEnergyMin(double maxEnergyMin) {
            this.maxEnergyMin = maxEnergyMin;
        }

        public double getMaxEnergyMax() {
            return maxEnergyMax;
        }

        public void setMaxEnergyMax(double maxEnergyMax) {
            this.maxEnergyMax = maxEnergyMax;
        }
    }

    public int getWorldWidth() {
        return worldWidth;
    }

    public void setWorldWidth(int worldWidth) {
        this.worldWidth = worldWidth;
    }

    public int getWorldHeight() {
        return worldHeight;
    }

    public void setWorldHeight(int worldHeight) {
        this.worldHeight = worldHeight;
    }

    public long getSimulationTickRateMs() {
        return simulationTickRateMs;
    }

    public void setSimulationTickRateMs(long simulationTickRateMs) {
        this.simulationTickRateMs = simulationTickRateMs;
    }

    public int getInitialSaprotrophCount() {
        return initialSaprotrophCount;
    }

    public void setInitialSaprotrophCount(int initialSaprotrophCount) {
        this.initialSaprotrophCount = initialSaprotrophCount;
    }

    public int getInitialFoodCount() {
        return initialFoodCount;
    }

    public void setInitialFoodCount(int initialFoodCount) {
        this.initialFoodCount = initialFoodCount;
    }

    public int getFoodGenerationIntensity() {
        return foodGenerationIntensity;
    }

    public void setFoodGenerationIntensity(int foodGenerationIntensity) {
        this.foodGenerationIntensity = foodGenerationIntensity;
    }

    public double getFoodGenerationMaxFrequencyMultiplier() {
        return foodGenerationMaxFrequencyMultiplier;
    }

    public void setFoodGenerationMaxFrequencyMultiplier(double foodGenerationMaxFrequencyMultiplier) {
        this.foodGenerationMaxFrequencyMultiplier = foodGenerationMaxFrequencyMultiplier;
    }

    public double getFoodEnergyMin() {
        return foodEnergyMin;
    }

    public void setFoodEnergyMin(double foodEnergyMin) {
        this.foodEnergyMin = foodEnergyMin;
    }

    public double getFoodEnergyRange() {
        return foodEnergyRange;
    }

    public void setFoodEnergyRange(double foodEnergyRange) {
        this.foodEnergyRange = foodEnergyRange;
    }

    public double getFoodConsumptionRadius() {
        return foodConsumptionRadius;
    }

    public void setFoodConsumptionRadius(double foodConsumptionRadius) {
        this.foodConsumptionRadius = foodConsumptionRadius;
    }

    public double getInitialSaprotrophEnergyMin() {
        return initialSaprotrophEnergyMin;
    }

    public void setInitialSaprotrophEnergyMin(double initialSaprotrophEnergyMin) {
        this.initialSaprotrophEnergyMin = initialSaprotrophEnergyMin;
    }

    public double getInitialSaprotrophEnergyRange() {
        return initialSaprotrophEnergyRange;
    }

    public void setInitialSaprotrophEnergyRange(double initialSaprotrophEnergyRange) {
        this.initialSaprotrophEnergyRange = initialSaprotrophEnergyRange;
    }

    public double getMinCellEnergy() {
        return minCellEnergy;
    }

    public void setMinCellEnergy(double minCellEnergy) {
        this.minCellEnergy = minCellEnergy;
    }

    public double getSaprotrophBaseEnergyDecayPerTick() {
        return saprotrophBaseEnergyDecayPerTick;
    }

    public void setSaprotrophBaseEnergyDecayPerTick(double saprotrophBaseEnergyDecayPerTick) {
        this.saprotrophBaseEnergyDecayPerTick = saprotrophBaseEnergyDecayPerTick;
    }

    public double getCellViscosityFactor() {
        return cellViscosityFactor;
    }

    public void setCellViscosityFactor(double cellViscosityFactor) {
        this.cellViscosityFactor = cellViscosityFactor;
    }

    public long getDeadCellLifetimeTicks() {
        return deadCellLifetimeTicks;
    }

    public void setDeadCellLifetimeTicks(long deadCellLifetimeTicks) {
        this.deadCellLifetimeTicks = deadCellLifetimeTicks;
    }

    public double getInitialSpawnCenterX() {
        return initialSpawnCenterX;
    }

    public void setInitialSpawnCenterX(double initialSpawnCenterX) {
        this.initialSpawnCenterX = initialSpawnCenterX;
    }

    public double getInitialSpawnCenterY() {
        return initialSpawnCenterY;
    }

    public void setInitialSpawnCenterY(double initialSpawnCenterY) {
        this.initialSpawnCenterY = initialSpawnCenterY;
    }

    public double getInitialSpawnOffsetRange() {
        return initialSpawnOffsetRange;
    }

    public void setInitialSpawnOffsetRange(double initialSpawnOffsetRange) {
        this.initialSpawnOffsetRange = initialSpawnOffsetRange;
    }

    public double getClientSaprotrophBaseRadius() {
        return clientSaprotrophBaseRadius;
    }

    public void setClientSaprotrophBaseRadius(double clientSaprotrophBaseRadius) {
        this.clientSaprotrophBaseRadius = clientSaprotrophBaseRadius;
    }

    public double getClientSaprotrophRadiusScale() {
        return clientSaprotrophRadiusScale;
    }

    public void setClientSaprotrophRadiusScale(double clientSaprotrophRadiusScale) {
        this.clientSaprotrophRadiusScale = clientSaprotrophRadiusScale;
    }

    public double getClientDirectionVectorLength() {
        return clientDirectionVectorLength;
    }

    public void setClientDirectionVectorLength(double clientDirectionVectorLength) {
        this.clientDirectionVectorLength = clientDirectionVectorLength;
    }

    public double getClientFoodRadiusAtMinEnergy() {
        return clientFoodRadiusAtMinEnergy;
    }

    public void setClientFoodRadiusAtMinEnergy(double clientFoodRadiusAtMinEnergy) {
        this.clientFoodRadiusAtMinEnergy = clientFoodRadiusAtMinEnergy;
    }

    public double getDivisionImpulseEnergyCostFactor() {
        return divisionImpulseEnergyCostFactor;
    }

    public void setDivisionImpulseEnergyCostFactor(double divisionImpulseEnergyCostFactor) {
        this.divisionImpulseEnergyCostFactor = divisionImpulseEnergyCostFactor;
    }

    public double getMinChildEnergyAfterDivision() {
        return minChildEnergyAfterDivision;
    }

    public void setMinChildEnergyAfterDivision(double minChildEnergyAfterDivision) {
        this.minChildEnergyAfterDivision = minChildEnergyAfterDivision;
    }

    public GenomeProperties getGenome() {
        return genome;
    }

    public void setGenome(GenomeProperties genome) {
        this.genome = genome;
    }
}