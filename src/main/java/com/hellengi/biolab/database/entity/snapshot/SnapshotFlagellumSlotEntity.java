package com.hellengi.biolab.database.entity.snapshot;

import com.hellengi.biolab.database.entity.common.DamageFlowEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_flagellum_slot")
public class SnapshotFlagellumSlotEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cell_id", nullable = false)
    private SnapshotCellEntity cell;

    @Column(nullable = false)
    private int slotIndex;

    @Column(nullable = false)
    private double lastForce;

    @Column(nullable = false)
    private double lastTorque;

    @Column(nullable = false)
    private double lastBaseX;

    @Column(nullable = false)
    private double lastBaseY;

    @Column(nullable = false)
    private double lastDirectionX;

    @Column(nullable = false)
    private double lastDirectionY;

    @Column(nullable = false)
    private double lastEnergyCostRate;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "damage", column = @Column(name = "damage_flow_damage", nullable = false)),
            @AttributeOverride(name = "damageRate", column = @Column(name = "damage_flow_damage_rate", nullable = false)),
            @AttributeOverride(name = "repairRate", column = @Column(name = "damage_flow_repair_rate", nullable = false)),
            @AttributeOverride(name = "repairEnergyCostRate", column = @Column(name = "damage_flow_repair_energy_cost_rate", nullable = false))
    })
    private DamageFlowEntity damageFlow = new DamageFlowEntity();
}
