package com.hellengi.biolab.database.entity.settings;

import com.hellengi.biolab.database.entity.common.RangedValueEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_settings_cell")
public class SnapshotCellSettingsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private double baseRadius;

    @Column(nullable = false)
    private double radiusScale;

    @Column(nullable = false)
    private double minEnergy;

    @Column(nullable = false)
    private double energyDecayPerTick;
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "initial_speed_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "initial_speed_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "initial_speed_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "initial_speed_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "initial_speed_initial", nullable = false))
    })
    private RangedValueEntity initialSpeed = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "initial_direction_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "initial_direction_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "initial_direction_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "initial_direction_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "initial_direction_initial", nullable = false))
    })
    private RangedValueEntity initialDirection = new RangedValueEntity();
}
