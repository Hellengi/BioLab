package com.hellengi.biolab.database.entity.snapshot;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_cell_event")
public class SnapshotCellEventEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cell_id", nullable = false)
    private SnapshotCellEntity cell;

    @Column(nullable = false)
    private int positionInCell;

    @Column(nullable = false, length = 40)
    private String type;

    private Double eventTime;

    @Column(nullable = false)
    private double duration;

    private Double impulse;
    private Double normalX;
    private Double normalY;
}


