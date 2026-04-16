package com.hellengi.biolab.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "saved_world")
public class SavedWorld {

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

    public SavedWorld() {
    }

    public SavedWorld(String name, LocalDateTime createdAt, String worldJson, String configJson) {
        this.name = name;
        this.createdAt = createdAt;
        this.worldJson = worldJson;
        this.configJson = configJson;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public String getWorldJson() {
        return worldJson;
    }

    public String getConfigJson() {
        return configJson;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setWorldJson(String worldJson) {
        this.worldJson = worldJson;
    }

    public void setConfigJson(String configJson) {
        this.configJson = configJson;
    }
}