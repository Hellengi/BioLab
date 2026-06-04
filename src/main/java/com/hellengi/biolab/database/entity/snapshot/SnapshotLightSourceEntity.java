package com.hellengi.biolab.database.entity.snapshot;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_light_source")
public class SnapshotLightSourceEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lighting_id", nullable = false)
    private SnapshotLightingEntity lighting;

    @Column(nullable = false)
    private int positionInSnapshot;

    @Column(nullable = false)
    private double x;

    @Column(nullable = false)
    private double y;

    @Column(nullable = false)
    private double brightness;

    @Column(nullable = false)
    private double orbitRadius;

    @Column(nullable = false)
    private double orbitSpeed;

    @Column(nullable = false)
    private double angle;

    @Column(length = 40)
    private String renderType;
}
