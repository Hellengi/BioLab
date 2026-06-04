package com.hellengi.biolab.database.entity.settings;

import com.hellengi.biolab.database.entity.common.RangedValueEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_genome_membrane_settings")
public class GenomeMembraneSettingsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "elasticity_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "elasticity_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "elasticity_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "elasticity_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "elasticity_initial", nullable = false))
    })
    private RangedValueEntity elasticity = new RangedValueEntity();

    @Column(nullable = false)
    private boolean melaninEnabled;
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "melanin_percent_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "melanin_percent_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "melanin_percent_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "melanin_percent_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "melanin_percent_initial", nullable = false))
    })
    private RangedValueEntity melaninPercent = new RangedValueEntity();
}
