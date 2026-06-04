package com.hellengi.biolab.database.entity.common;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Embeddable
public class EnergyFlowEntity {
    @Column(nullable = false) private double energy;
    @Column(nullable = false) private double productionRate;
    @Column(nullable = false) private double consumptionRate;
    @Column(nullable = false) private double digestionProductionRate;
    @Column(nullable = false) private double digestionCostRate;
    @Column(nullable = false) private double repairCostRate;
    @Column(nullable = false) private double divisionCost;
}
