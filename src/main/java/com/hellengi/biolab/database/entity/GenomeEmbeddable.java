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
    private double maxEnergy;

    @Column(nullable = false)
    private double dryMass;

    @Column(nullable = false)
    private double elasticity;

    @Column(nullable = false)
    private double gfp;

    @Column(nullable = false)
    private boolean melaninEnabled;

    @Column(nullable = false)
    private double melaninPercent;

    @Column(nullable = false)
    private boolean chloroplastEnabled;

    @Column(nullable = false)
    private double chloroplastAmount;

    @Column(nullable = false)
    private double chlorophyll;

    @Column(nullable = false)
    private double carotenoids;

    @Column(nullable = false)
    private boolean lysosomeEnabled;

    @Column(nullable = false)
    private double lysosomeAmount;

    @Column(nullable = false)
    private double lysosomeEnzymeActivity;

    public GenomeEmbeddable() {
    }

    public GenomeEmbeddable(
            double divisionThreshold,
            double divisionImpulse,
            double divisionAngle,
            double maxEnergy,
            double dryMass,
            double elasticity,
            double gfp,
            boolean melaninEnabled,
            double melaninPercent,
            boolean chloroplastEnabled,
            double chloroplastAmount,
            double chlorophyll,
            double carotenoids,
            boolean lysosomeEnabled,
            double lysosomeAmount,
            double lysosomeEnzymeActivity
    ) {
        this.divisionThreshold = divisionThreshold;
        this.divisionImpulse = divisionImpulse;
        this.divisionAngle = divisionAngle;
        this.maxEnergy = maxEnergy;
        this.dryMass = dryMass;
        this.elasticity = elasticity;
        this.gfp = gfp;
        this.melaninEnabled = melaninEnabled;
        this.melaninPercent = melaninPercent;
        this.chloroplastEnabled = chloroplastEnabled;
        this.chloroplastAmount = chloroplastAmount;
        this.chlorophyll = chlorophyll;
        this.carotenoids = carotenoids;
        this.lysosomeEnabled = lysosomeEnabled;
        this.lysosomeAmount = lysosomeAmount;
        this.lysosomeEnzymeActivity = lysosomeEnzymeActivity;
    }
}
