package com.hellengi.biolab.database.entity.common;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Embeddable
public class PhysicalStateEntity {
    @Column(nullable = false) private double x;
    @Column(nullable = false) private double y;
    @Column(nullable = false) private double vx;
    @Column(nullable = false) private double vy;
    @Column(nullable = false) private double radius;
    @Column(nullable = false) private double mass;
    @Column(nullable = false) private double density;
    private Double opacity;
    @Column(nullable = false) private double directionAngle;
}
