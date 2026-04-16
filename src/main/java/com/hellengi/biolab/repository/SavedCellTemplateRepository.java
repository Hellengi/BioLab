package com.hellengi.biolab.repository;

import com.hellengi.biolab.model.SavedCellTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavedCellTemplateRepository extends JpaRepository<SavedCellTemplate, Long> {

    List<SavedCellTemplate> findAllByOrderByCreatedAtDesc();
}