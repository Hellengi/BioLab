package com.hellengi.biolab.repository;

import com.hellengi.biolab.model.SavedWorld;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavedWorldRepository extends JpaRepository<SavedWorld, Long> {

    List<SavedWorld> findAllByOrderByCreatedAtDesc();
}