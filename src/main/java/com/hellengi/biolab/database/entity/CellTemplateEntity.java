package com.hellengi.biolab.database.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "cell_template")
public class CellTemplateEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Embedded
    private GenomeEmbeddable genome;

    public CellTemplateEntity() {
    }

    public CellTemplateEntity(
            String name,
            LocalDateTime createdAt,
            GenomeEmbeddable genome
    ) {
        this.name = name;
        this.createdAt = createdAt;
        this.genome = genome;
    }
}