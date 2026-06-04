package com.hellengi.biolab.database.entity.settings;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_settings")
public class SnapshotSettingsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private int tubeDiameter;

    @Column(nullable = false)
    private long tickRateMs;

    @Column(nullable = false)
    private boolean paused;

    @Column(nullable = false)
    private double speedFactor;

    @Column(nullable = false)
    private double temperatureCelsius;

    @Column(nullable = false)
    private double viscosity;

    @Column(nullable = false)
    private double gravity;

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "time_id", nullable = false)
    private SnapshotTimeSettingsEntity time = new SnapshotTimeSettingsEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "environment_id", nullable = false)
    private SnapshotEnvironmentSettingsEntity environment = new SnapshotEnvironmentSettingsEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "light_cycle_id", nullable = false)
    private SnapshotLightCycleSettingsEntity lightCycle = new SnapshotLightCycleSettingsEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "local_lights_id", nullable = false)
    private SnapshotLocalLightsSettingsEntity localLights = new SnapshotLocalLightsSettingsEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "food_id", nullable = false)
    private SnapshotFoodSettingsEntity food = new SnapshotFoodSettingsEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "cell_id", nullable = false)
    private SnapshotCellSettingsEntity cell = new SnapshotCellSettingsEntity();

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "initial_genome_id", nullable = false)
    private GenomeSettingsEntity initialGenome = new GenomeSettingsEntity();
}
