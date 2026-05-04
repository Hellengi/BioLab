package com.hellengi.biolab.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "cell_template")
public class CellTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Embedded
    private GenomeSnapshot genome;

    public CellTemplate() {
    }

    public CellTemplate(
            String name,
            LocalDateTime createdAt,
            GenomeSnapshot genome
    ) {
        this.name = name;
        this.createdAt = createdAt;
        this.genome = genome;
    }
}