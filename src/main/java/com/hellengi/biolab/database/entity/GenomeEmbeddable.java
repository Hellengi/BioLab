package com.hellengi.biolab.database.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Embeddable
public class GenomeEmbeddable {
    @Column(nullable = false)
    private double divisionThreshold;

    @Column(nullable = false)
    private double divisionImpulse;

    @Column(nullable = false)
    private double divisionAngle;

    @Column(nullable = false)
    private double colorHue;

    @Column(nullable = false)
    private double saturation;

    @Column(nullable = false)
    private double lightness;

    @Column(nullable = false)
    private double maxEnergy;

    @Column(nullable = false)
    private double dryMass;

    @Column(nullable = false)
    private double elasticity;

    public GenomeEmbeddable() {
    }

    public GenomeEmbeddable(
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
}