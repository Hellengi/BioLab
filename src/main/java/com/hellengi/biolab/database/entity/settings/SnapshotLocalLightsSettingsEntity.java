package com.hellengi.biolab.database.entity.settings;

import com.hellengi.biolab.database.entity.common.RangedValueEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_settings_local_lights")
public class SnapshotLocalLightsSettingsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private boolean enabled;
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "source_count_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "source_count_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "source_count_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "source_count_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "source_count_initial", nullable = false))
    })
    private RangedValueEntity sourceCount = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "start_angle_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "start_angle_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "start_angle_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "start_angle_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "start_angle_initial", nullable = false))
    })
    private RangedValueEntity startAngle = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "brightness_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "brightness_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "brightness_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "brightness_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "brightness_initial", nullable = false))
    })
    private RangedValueEntity brightness = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "orbit_radius_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "orbit_radius_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "orbit_radius_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "orbit_radius_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "orbit_radius_initial", nullable = false))
    })
    private RangedValueEntity orbitRadius = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "orbit_speed_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "orbit_speed_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "orbit_speed_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "orbit_speed_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "orbit_speed_initial", nullable = false))
    })
    private RangedValueEntity orbitSpeed = new RangedValueEntity();
}
