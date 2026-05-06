package com.hellengi.biolab.persistence.entity;

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
    private double divisionImpulseStrength;

    @Column(nullable = false)
    private double colorHue;

    @Column(nullable = false)
    private double saturation;

    @Column(nullable = false)
    private double lightness;

    @Column(nullable = false)
    private double maxEnergy;

    public GenomeEmbeddable() {
    }

    public GenomeEmbeddable(
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
}