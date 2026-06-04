package com.hellengi.biolab.database.entity.settings;

import com.hellengi.biolab.database.entity.common.RangedValueEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_settings_time")
public class SnapshotTimeSettingsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "time_slider_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "time_slider_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "time_slider_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "time_slider_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "time_slider_initial", nullable = false))
    })
    private RangedValueEntity timeSlider = new RangedValueEntity();
}
