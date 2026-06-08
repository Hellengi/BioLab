package com.hellengi.biolab.database.entity.snapshot;

import com.hellengi.biolab.database.entity.common.DamageFlowEntity;
import com.hellengi.biolab.database.entity.common.EnergyFlowEntity;
import com.hellengi.biolab.database.entity.common.LayoutStateEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_lysosome_slot")
public class SnapshotLysosomeSlotEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cell_id", nullable = false)
    private SnapshotCellEntity cell;

    @Column(nullable = false)
    private int slotIndex;

    private Long foodWorldId;

    @Column(nullable = false)
    private boolean occupied;

    @Column(nullable = false)
    private double performance;

    @Column(nullable = false)
    private double foodEnergy;

    @Column(nullable = false)
    private double foodRadius;

    @Column(nullable = false)
    private boolean foodInsideLysosome;

    @Column(nullable = false)
    private double targetFoodRadius;
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "x", column = @Column(name = "layout_x", nullable = false)),
            @AttributeOverride(name = "y", column = @Column(name = "layout_y", nullable = false)),
            @AttributeOverride(name = "radius", column = @Column(name = "layout_radius", nullable = false)),
            @AttributeOverride(name = "rotation", column = @Column(name = "layout_rotation", nullable = false)),
            @AttributeOverride(name = "targetX", column = @Column(name = "layout_target_x", nullable = false)),
            @AttributeOverride(name = "targetY", column = @Column(name = "layout_target_y", nullable = false)),
            @AttributeOverride(name = "targetRadius", column = @Column(name = "layout_target_radius", nullable = false)),
            @AttributeOverride(name = "targetRotation", column = @Column(name = "layout_target_rotation", nullable = false))
    })
    private LayoutStateEntity layout = new LayoutStateEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "energy", column = @Column(name = "energy_flow_energy", nullable = false)),
            @AttributeOverride(name = "productionRate", column = @Column(name = "energy_flow_production_rate", nullable = false)),
            @AttributeOverride(name = "consumptionRate", column = @Column(name = "energy_flow_consumption_rate", nullable = false)),
            @AttributeOverride(name = "digestionProductionRate", column = @Column(name = "energy_flow_digestion_production_rate", nullable = false)),
            @AttributeOverride(name = "digestionCostRate", column = @Column(name = "energy_flow_digestion_cost_rate", nullable = false)),
            @AttributeOverride(name = "repairCostRate", column = @Column(name = "energy_flow_repair_cost_rate", nullable = false)),
            @AttributeOverride(name = "divisionCost", column = @Column(name = "energy_flow_division_cost", nullable = false))
    })
    private EnergyFlowEntity energyFlow = new EnergyFlowEntity();
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "damage", column = @Column(name = "damage_flow_damage", nullable = false)),
            @AttributeOverride(name = "damageRate", column = @Column(name = "damage_flow_damage_rate", nullable = false)),
            @AttributeOverride(name = "repairRate", column = @Column(name = "damage_flow_repair_rate", nullable = false)),
            @AttributeOverride(name = "repairEnergyCostRate", column = @Column(name = "damage_flow_repair_energy_cost_rate", nullable = false))
    })
    private DamageFlowEntity damageFlow = new DamageFlowEntity();
}


