package com.hellengi.biolab.database.entity.settings;

import com.hellengi.biolab.database.entity.common.RangedValueEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_genome_nucleus_settings")
public class GenomeNucleusSettingsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "division_threshold_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "division_threshold_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "division_threshold_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "division_threshold_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "division_threshold_initial", nullable = false))
    })
    private RangedValueEntity divisionThreshold = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "division_impulse_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "division_impulse_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "division_impulse_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "division_impulse_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "division_impulse_initial", nullable = false))
    })
    private RangedValueEntity divisionImpulse = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "division_angle_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "division_angle_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "division_angle_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "division_angle_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "division_angle_initial", nullable = false))
    })
    private RangedValueEntity divisionAngle = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "start_cell_damage_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "start_cell_damage_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "start_cell_damage_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "start_cell_damage_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "start_cell_damage_initial", nullable = false))
    })
    private RangedValueEntity startCellDamage = new RangedValueEntity();
}
