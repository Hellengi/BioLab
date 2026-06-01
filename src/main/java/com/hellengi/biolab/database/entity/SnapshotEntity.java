package com.hellengi.biolab.database.entity;

import jakarta.persistence.*;
import lombok.Setter;
import lombok.Getter;

import java.time.LocalDateTime;

@Setter
@Getter
@Entity
@Table(name = "environment_snapshot")
public class SnapshotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String worldJson;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String configJson;

    public SnapshotEntity() {
    }

    public SnapshotEntity(String name, LocalDateTime createdAt, String worldJson, String configJson) {
        this.name = name;
        this.createdAt = createdAt;
        this.worldJson = worldJson;
        this.configJson = configJson;
    }

}