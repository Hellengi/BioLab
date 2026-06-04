package com.hellengi.biolab.database.entity.settings;

import com.hellengi.biolab.database.entity.common.RangedValueEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_genome_lysosomes_settings")
public class GenomeLysosomesSettingsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private boolean enabled;
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "amount_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "amount_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "amount_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "amount_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "amount_initial", nullable = false))
    })
    private RangedValueEntity amount = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "enzyme_activity_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "enzyme_activity_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "enzyme_activity_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "enzyme_activity_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "enzyme_activity_initial", nullable = false))
    })
    private RangedValueEntity enzymeActivity = new RangedValueEntity();
}
