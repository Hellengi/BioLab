package com.hellengi.biolab.database.entity.settings;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_genome_settings")
public class GenomeSettingsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "nucleus_id", nullable = false)
    private GenomeNucleusSettingsEntity nucleus = new GenomeNucleusSettingsEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "cytosol_id", nullable = false)
    private GenomeCytosolSettingsEntity cytosol = new GenomeCytosolSettingsEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "membrane_id", nullable = false)
    private GenomeMembraneSettingsEntity membrane = new GenomeMembraneSettingsEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "chloroplasts_id", nullable = false)
    private GenomeChloroplastsSettingsEntity chloroplasts = new GenomeChloroplastsSettingsEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "lysosomes_id", nullable = false)
    private GenomeLysosomesSettingsEntity lysosomes = new GenomeLysosomesSettingsEntity();
}
