package com.hellengi.biolab.database.entity.genome;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "genome")
public class GenomeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "nucleus_id", nullable = false)
    private NucleusEntity nucleus = new NucleusEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "cytosol_id", nullable = false)
    private CytosolEntity cytosol = new CytosolEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "membrane_id", nullable = false)
    private MembraneEntity membrane = new MembraneEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "chloroplasts_id", nullable = false)
    private ChloroplastsEntity chloroplasts = new ChloroplastsEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "lysosomes_id", nullable = false)
    private LysosomesEntity lysosomes = new LysosomesEntity();
}
