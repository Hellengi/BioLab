package com.hellengi.biolab.database.entity.genome;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "genome_nucleus")
public class NucleusEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private double divisionThreshold;

    @Column(nullable = false)
    private double divisionImpulse;

    @Column(nullable = false)
    private double divisionAngle;
}
