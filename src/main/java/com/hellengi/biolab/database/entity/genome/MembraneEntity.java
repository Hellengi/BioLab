package com.hellengi.biolab.database.entity.genome;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "genome_membrane")
public class MembraneEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private double elasticity;

    @Column(nullable = false)
    private boolean melaninEnabled;

    @Column(nullable = false)
    private double melaninPercent;
}


