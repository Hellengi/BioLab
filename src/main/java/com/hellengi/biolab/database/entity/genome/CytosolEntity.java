package com.hellengi.biolab.database.entity.genome;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "genome_cytosol")
public class CytosolEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private double maxEnergy;

    @Column(nullable = false)
    private double dryMass;

    @Column(nullable = false)
    private double gfp;
}
