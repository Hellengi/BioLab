package com.hellengi.biolab.database.entity.common;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Embeddable
public class RangedValueEntity {
    @Column(nullable = false) private double value;
    @Column(nullable = false) private double min;
    @Column(nullable = false) private double max;
    @Column(nullable = false) private double step;
    @Column(nullable = false) private double initial;
}
