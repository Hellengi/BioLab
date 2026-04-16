package com.hellengi.biolab.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "saved_cell_template")
public class SavedCellTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private double divisionThreshold;

    @Column(nullable = false)
    private double divisionImpulseStrength;

    @Column(nullable = false)
    private double colorHue;

    @Column(nullable = false)
    private double lightness;

    @Column(nullable = false)
    private double maxEnergy;

    public SavedCellTemplate() {
    }

    public SavedCellTemplate(
            String name,
            LocalDateTime createdAt,
            double divisionThreshold,
            double divisionImpulseStrength,
            double colorHue,
            double lightness,
            double maxEnergy
    ) {
        this.name = name;
        this.createdAt = createdAt;
        this.divisionThreshold = divisionThreshold;
        this.divisionImpulseStrength = divisionImpulseStrength;
        this.colorHue = colorHue;
        this.lightness = lightness;
        this.maxEnergy = maxEnergy;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public double getDivisionThreshold() {
        return divisionThreshold;
    }

    public double getDivisionImpulseStrength() {
        return divisionImpulseStrength;
    }

    public double getColorHue() {
        return colorHue;
    }

    public double getLightness() {
        return lightness;
    }

    public double getMaxEnergy() {
        return maxEnergy;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setDivisionThreshold(double divisionThreshold) {
        this.divisionThreshold = divisionThreshold;
    }

    public void setDivisionImpulseStrength(double divisionImpulseStrength) {
        this.divisionImpulseStrength = divisionImpulseStrength;
    }

    public void setColorHue(double colorHue) {
        this.colorHue = colorHue;
    }

    public void setLightness(double lightness) {
        this.lightness = lightness;
    }

    public void setMaxEnergy(double maxEnergy) {
        this.maxEnergy = maxEnergy;
    }
}