package com.hellengi.biolab.model;

public class Genome {

    private double divisionThreshold;
    private double divisionImpulseStrength;
    private double colorHue;
    private double lightness;
    private double maxEnergy;

    public Genome(
            double divisionThreshold,
            double divisionImpulseStrength,
            double colorHue,
            double lightness,
            double maxEnergy
    ) {
        this.divisionThreshold = divisionThreshold;
        this.divisionImpulseStrength = divisionImpulseStrength;
        this.colorHue = colorHue;
        this.lightness = lightness;
        this.maxEnergy = maxEnergy;
    }

    public double getDivisionThreshold() {
        return divisionThreshold;
    }

    public void setDivisionThreshold(double divisionThreshold) {
        this.divisionThreshold = divisionThreshold;
    }

    public double getDivisionImpulseStrength() {
        return divisionImpulseStrength;
    }

    public void setDivisionImpulseStrength(double divisionImpulseStrength) {
        this.divisionImpulseStrength = divisionImpulseStrength;
    }

    public double getColorHue() {
        return colorHue;
    }

    public void setColorHue(double colorHue) {
        this.colorHue = colorHue;
    }

    public double getLightness() {
        return lightness;
    }

    public void setLightness(double lightness) {
        this.lightness = lightness;
    }

    public double getMaxEnergy() {
        return maxEnergy;
    }

    public void setMaxEnergy(double maxEnergy) {
        this.maxEnergy = maxEnergy;
    }

    public Genome copy() {
        return new Genome(
                divisionThreshold,
                divisionImpulseStrength,
                colorHue,
                lightness,
                maxEnergy
        );
    }
}