package com.hellengi.biolab.database.entity.genome;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "genome_chloroplasts")
public class ChloroplastsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private boolean enabled;

    @Column(nullable = false)
    private double amount;

    @Column(nullable = false)
    private double chlorophyll;

    @Column(nullable = false)
    private double carotenoids;
}


