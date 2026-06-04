package com.hellengi.biolab.database.entity.snapshot;

import com.hellengi.biolab.database.entity.SnapshotEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "snapshot_lighting")
public class SnapshotLightingEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "snapshot_id", nullable = false)
    private SnapshotEntity snapshot;

    @Column(nullable = false)
    private double globalLight;

    @Column(nullable = false)
    private double cycleTick;

    @Column(nullable = false)
    private int gridStep;

    @Column(nullable = false)
    private int gridWidth;

    @Column(nullable = false)
    private int gridHeight;

    @OneToMany(mappedBy = "lighting", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("positionInSnapshot ASC")
    private List<SnapshotLightSourceEntity> sources = new ArrayList<>();

    public void addSource(SnapshotLightSourceEntity source) {
        sources.add(source);
        source.setLighting(this);
    }
}
