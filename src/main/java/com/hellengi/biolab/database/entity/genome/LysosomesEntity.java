package com.hellengi.biolab.database.entity.genome;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "genome_lysosomes")
public class LysosomesEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private boolean enabled;

    @Column(nullable = false)
    private double amount;

    @Column(nullable = false)
    private double enzymeActivity;
}


