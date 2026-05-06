package com.hellengi.biolab.persistence.entity;

import jakarta.persistence.*;
import lombok.Setter;
import lombok.Getter;

import java.time.LocalDateTime;

@Setter
@Getter
@Entity
@Table(name = "environment_snapshot")
public class EnvironmentSnapshotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String stateJson;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String configJson;

    public EnvironmentSnapshotEntity() {
    }

    public EnvironmentSnapshotEntity(String name, LocalDateTime createdAt, String stateJson, String configJson) {
        this.name = name;
        this.createdAt = createdAt;
        this.stateJson = stateJson;
        this.configJson = configJson;
    }

}