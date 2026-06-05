package com.hellengi.biolab.database.entity;

import com.hellengi.biolab.database.entity.snapshot.*;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "snapshot")
public class SnapshotEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "world_state_id", nullable = false)
    private SnapshotWorldStateEntity worldState = new SnapshotWorldStateEntity();

    @Lob
    @Column(name = "settings_json", nullable = false, columnDefinition = "TEXT")
    private String settingsJson;

    @OneToMany(mappedBy = "snapshot", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("positionInSnapshot ASC")
    private List<SnapshotCellEntity> cells = new ArrayList<>();

    @OneToMany(mappedBy = "snapshot", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("positionInSnapshot ASC")
    private List<SnapshotFoodEntity> foods = new ArrayList<>();

    @OneToOne(mappedBy = "snapshot", cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    private SnapshotLightingEntity lighting = new SnapshotLightingEntity();

    public void addCell(SnapshotCellEntity cell) {
        cells.add(cell);
        cell.setSnapshot(this);
    }

    public void addFood(SnapshotFoodEntity food) {
        foods.add(food);
        food.setSnapshot(this);
    }

    public void setLighting(SnapshotLightingEntity lighting) {
        this.lighting = lighting;
        if (lighting != null) {
            lighting.setSnapshot(this);
        }
    }
}
