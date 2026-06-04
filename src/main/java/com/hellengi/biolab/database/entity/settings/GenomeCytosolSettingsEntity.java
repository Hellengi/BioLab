package com.hellengi.biolab.database.entity.settings;

import com.hellengi.biolab.database.entity.common.RangedValueEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_genome_cytosol_settings")
public class GenomeCytosolSettingsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "max_energy_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "max_energy_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "max_energy_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "max_energy_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "max_energy_initial", nullable = false))
    })
    private RangedValueEntity maxEnergy = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "dry_mass_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "dry_mass_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "dry_mass_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "dry_mass_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "dry_mass_initial", nullable = false))
    })
    private RangedValueEntity dryMass = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "gfp_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "gfp_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "gfp_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "gfp_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "gfp_initial", nullable = false))
    })
    private RangedValueEntity gfp = new RangedValueEntity();
}
