package com.hellengi.biolab.database.entity.settings;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_settings_food")
public class SnapshotFoodSettingsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private double baseRadius;

    @Column(nullable = false)
    private int initialCount;

    @Column(nullable = false)
    private double energyMin;

    @Column(nullable = false)
    private double energyMax;
}
