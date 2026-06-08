package com.hellengi.biolab.database.entity.snapshot;

import com.hellengi.biolab.database.entity.SnapshotEntity;
import com.hellengi.biolab.database.entity.common.EnergyFlowEntity;
import com.hellengi.biolab.database.entity.common.PhysicalStateEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_food")
public class SnapshotFoodEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "snapshot_id", nullable = false)
    private SnapshotEntity snapshot;

    @Column(nullable = false)
    private int positionInSnapshot;

    @Column(nullable = false)
    private long worldFoodId;

    @Column(nullable = false)
    private boolean consumed;

    private Long capturedByCellId;

    @Column(nullable = false)
    private int digestionSlotIndex;

    @Column(nullable = false)
    private boolean insideLysosome;

    private Double capturedCellAnchorX;
    private Double capturedCellAnchorY;
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "x", column = @Column(name = "physical_state_x", nullable = false)),
            @AttributeOverride(name = "y", column = @Column(name = "physical_state_y", nullable = false)),
            @AttributeOverride(name = "vx", column = @Column(name = "physical_state_vx", nullable = false)),
            @AttributeOverride(name = "vy", column = @Column(name = "physical_state_vy", nullable = false)),
            @AttributeOverride(name = "angularVelocity", column = @Column(name = "physical_state_angular_velocity", nullable = false)),
            @AttributeOverride(name = "radius", column = @Column(name = "physical_state_radius", nullable = false)),
            @AttributeOverride(name = "mass", column = @Column(name = "physical_state_mass", nullable = false)),
            @AttributeOverride(name = "density", column = @Column(name = "physical_state_density", nullable = false)),
            @AttributeOverride(name = "opacity", column = @Column(name = "physical_state_opacity")),
            @AttributeOverride(name = "directionAngle", column = @Column(name = "physical_state_direction_angle", nullable = false))
    })
    private PhysicalStateEntity physicalState = new PhysicalStateEntity();
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
}


