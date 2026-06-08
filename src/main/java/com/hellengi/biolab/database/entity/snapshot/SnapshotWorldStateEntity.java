package com.hellengi.biolab.database.entity.snapshot;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_world_state")
public class SnapshotWorldStateEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private long tick;

    @Column(nullable = false)
    private double time;

    @Column(nullable = false)
    private double foodSpawnBudget;

    @Column(nullable = false)
    private int tubeDiameter;
}


