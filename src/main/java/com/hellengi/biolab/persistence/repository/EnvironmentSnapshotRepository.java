package com.hellengi.biolab.persistence.repository;

import com.hellengi.biolab.persistence.entity.EnvironmentSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EnvironmentSnapshotRepository extends JpaRepository<EnvironmentSnapshot, Long> {

    List<EnvironmentSnapshot> findAllByOrderByCreatedAtDesc();
}