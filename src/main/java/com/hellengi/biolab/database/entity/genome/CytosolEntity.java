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
    private double area;

    @Column(nullable = false)
    private double density;

    @Column(nullable = false)
    private boolean bioluminescenceEnabled;

    @Column(nullable = false)
    private double bioluminescence;
}
