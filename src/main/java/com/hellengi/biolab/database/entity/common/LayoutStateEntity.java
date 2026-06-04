package com.hellengi.biolab.database.entity.common;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Embeddable
public class LayoutStateEntity {
    @Column(nullable = false) private double x;
    @Column(nullable = false) private double y;
    @Column(nullable = false) private double radius;
    @Column(nullable = false) private double rotation;
    @Column(nullable = false) private double targetX;
    @Column(nullable = false) private double targetY;
    @Column(nullable = false) private double targetRadius;
    @Column(nullable = false) private double targetRotation;
}
