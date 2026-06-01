package com.hellengi.biolab.database.repository;

import com.hellengi.biolab.database.entity.StrainEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StrainRepository extends JpaRepository<StrainEntity, Long> {

    List<StrainEntity> findAllByOrderByCreatedAtDesc();
}