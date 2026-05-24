package com.hellengi.biolab.domain.model;

import com.hellengi.biolab.util.GenomeCodec;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class Genome {
    private double divisionThreshold;
    private double divisionImpulse;
    private double divisionAngle;
    private double colorHue;
    private double saturation;
    private double lightness;
    private double maxEnergy;
    private double dryMass;
    private double elasticity;

    public Genome(
            double divisionThreshold,
            double divisionImpulse,
            double divisionAngle,
            double colorHue,
            double saturation,
            double lightness,
            double maxEnergy,
            double dryMass,
            double elasticity
    ) {
        this.divisionThreshold = divisionThreshold;
        this.divisionImpulse = divisionImpulse;
        this.divisionAngle = divisionAngle;
        this.colorHue = colorHue;
        this.saturation = saturation;
        this.lightness = lightness;
        this.maxEnergy = maxEnergy;
        this.dryMass = dryMass;
        this.elasticity = elasticity;
    }

    public String getCode() {
        return GenomeCodec.encode(this);
    }

    public Genome copy() {
        return new Genome(
                divisionThreshold,
                divisionImpulse,
                divisionAngle,
                colorHue,
                saturation,
                lightness,
                maxEnergy,
                dryMass,
                elasticity
        );
    }
}