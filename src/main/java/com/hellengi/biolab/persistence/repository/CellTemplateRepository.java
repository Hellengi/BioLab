package com.hellengi.biolab.persistence.repository;

import com.hellengi.biolab.persistence.entity.CellTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CellTemplateRepository extends JpaRepository<CellTemplateEntity, Long> {

    List<CellTemplateEntity> findAllByOrderByCreatedAtDesc();
}