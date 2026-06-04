package com.hellengi.biolab.database.entity.settings;

import com.hellengi.biolab.database.entity.common.RangedValueEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_settings_light_cycle")
public class SnapshotLightCycleSettingsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "global_light_percent_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "global_light_percent_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "global_light_percent_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "global_light_percent_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "global_light_percent_initial", nullable = false))
    })
    private RangedValueEntity globalLightPercent = new RangedValueEntity();

    @Column(nullable = false)
    private boolean enabled;
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "min_percent_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "min_percent_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "min_percent_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "min_percent_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "min_percent_initial", nullable = false))
    })
    private RangedValueEntity minPercent = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "period_seconds_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "period_seconds_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "period_seconds_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "period_seconds_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "period_seconds_initial", nullable = false))
    })
    private RangedValueEntity periodSeconds = new RangedValueEntity();
}
