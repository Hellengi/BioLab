package com.hellengi.biolab.database.repository;

import com.hellengi.biolab.database.entity.SnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SnapshotRepository extends JpaRepository<SnapshotEntity, Long> {

    List<SnapshotEntity> findAllByOrderByCreatedAtDesc();
}
