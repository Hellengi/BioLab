package com.hellengi.biolab.database.entity.settings;

import com.hellengi.biolab.database.entity.common.RangedValueEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_genome_chloroplasts_settings")
public class GenomeChloroplastsSettingsEntity {
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
            @AttributeOverride(name = "value", column = @Column(name = "chlorophyll_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "chlorophyll_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "chlorophyll_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "chlorophyll_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "chlorophyll_initial", nullable = false))
    })
    private RangedValueEntity chlorophyll = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "carotenoids_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "carotenoids_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "carotenoids_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "carotenoids_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "carotenoids_initial", nullable = false))
    })
    private RangedValueEntity carotenoids = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "start_damage_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "start_damage_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "start_damage_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "start_damage_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "start_damage_initial", nullable = false))
    })
    private RangedValueEntity startDamage = new RangedValueEntity();
}
