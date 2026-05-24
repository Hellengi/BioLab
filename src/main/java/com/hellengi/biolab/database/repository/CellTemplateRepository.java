package com.hellengi.biolab.database.repository;

import com.hellengi.biolab.database.entity.CellTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CellTemplateRepository extends JpaRepository<CellTemplateEntity, Long> {

    List<CellTemplateEntity> findAllByOrderByCreatedAtDesc();
}