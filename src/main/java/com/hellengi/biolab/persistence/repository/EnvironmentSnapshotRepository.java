package com.hellengi.biolab.persistence.repository;

import com.hellengi.biolab.persistence.entity.EnvironmentSnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EnvironmentSnapshotRepository extends JpaRepository<EnvironmentSnapshotEntity, Long> {

    List<EnvironmentSnapshotEntity> findAllByOrderByCreatedAtDesc();
}