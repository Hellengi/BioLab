package com.hellengi.biolab.database.entity.genome;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "genome_flagella")
public class FlagellaEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private boolean enabled;

    @Column(nullable = false)
    private int count = 1;

    @Column(nullable = false)
    private double length = 1.8;

    @Column(nullable = false)
    private double motorPower = 30.0;


    @Column(nullable = false)
    private double pairSpreadAngle = 36.0;

    @Column(nullable = false)
    private double steeringAsymmetry = 0.0;
}
