package com.hellengi.biolab.database.entity.settings;

import com.hellengi.biolab.database.entity.common.RangedValueEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_settings_environment")
public class SnapshotEnvironmentSettingsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "initial_cell_count_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "initial_cell_count_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "initial_cell_count_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "initial_cell_count_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "initial_cell_count_initial", nullable = false))
    })
    private RangedValueEntity initialCellCount = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "food_spawn_intensity_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "food_spawn_intensity_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "food_spawn_intensity_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "food_spawn_intensity_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "food_spawn_intensity_initial", nullable = false))
    })
    private RangedValueEntity foodSpawnIntensity = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "gravity_slider_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "gravity_slider_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "gravity_slider_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "gravity_slider_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "gravity_slider_initial", nullable = false))
    })
    private RangedValueEntity gravitySlider = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "viscosity_slider_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "viscosity_slider_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "viscosity_slider_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "viscosity_slider_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "viscosity_slider_initial", nullable = false))
    })
    private RangedValueEntity viscositySlider = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "turbidity_slider_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "turbidity_slider_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "turbidity_slider_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "turbidity_slider_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "turbidity_slider_initial", nullable = false))
    })
    private RangedValueEntity turbiditySlider = new RangedValueEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "radiation_slider_value", nullable = false)),
            @AttributeOverride(name = "min", column = @Column(name = "radiation_slider_min", nullable = false)),
            @AttributeOverride(name = "max", column = @Column(name = "radiation_slider_max", nullable = false)),
            @AttributeOverride(name = "step", column = @Column(name = "radiation_slider_step", nullable = false)),
            @AttributeOverride(name = "initial", column = @Column(name = "radiation_slider_initial", nullable = false))
    })
    private RangedValueEntity radiationSlider = new RangedValueEntity();
}
