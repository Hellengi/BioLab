package com.hellengi.biolab.model;

import com.hellengi.biolab.util.GenomeCodec;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class Genome {
    private double divisionThreshold;
    private double divisionImpulseStrength;
    private double colorHue;
    private double saturation;
    private double lightness;
    private double maxEnergy;

    public Genome(
            double divisionThreshold,
            double divisionImpulseStrength,
            double colorHue,
            double saturation,
            double lightness,
            double maxEnergy
    ) {
        this.divisionThreshold = divisionThreshold;
        this.divisionImpulseStrength = divisionImpulseStrength;
        this.colorHue = colorHue;
        this.saturation = saturation;
        this.lightness = lightness;
        this.maxEnergy = maxEnergy;
    }

    public String getCode() {
        return GenomeCodec.encode(this);
    }

    public Genome copy() {
        return new Genome(
                divisionThreshold,
                divisionImpulseStrength,
                colorHue,
                saturation,
                lightness,
                maxEnergy
        );
    }
}