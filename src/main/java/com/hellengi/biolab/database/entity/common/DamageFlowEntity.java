package com.hellengi.biolab.database.entity.common;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Embeddable
public class DamageFlowEntity {
    @Column(nullable = false) private double damage;
    @Column(nullable = false) private double damageRate;
    @Column(nullable = false) private double repairRate;
    @Column(nullable = false) private double repairEnergyCostRate;
}
