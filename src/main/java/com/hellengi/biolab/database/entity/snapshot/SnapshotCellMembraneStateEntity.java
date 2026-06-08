package com.hellengi.biolab.database.entity.snapshot;

import com.hellengi.biolab.database.entity.common.DamageFlowEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_cell_membrane_state")
public class SnapshotCellMembraneStateEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cell_id", nullable = false)
    private SnapshotCellEntity cell;

    @Column(nullable = false)
    private double opacity;

    @Column(nullable = false)
    private double lightTransmittance;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "damage", column = @Column(name = "damage_flow_damage", nullable = false)),
            @AttributeOverride(name = "damageRate", column = @Column(name = "damage_flow_damage_rate", nullable = false)),
            @AttributeOverride(name = "repairRate", column = @Column(name = "damage_flow_repair_rate", nullable = false)),
            @AttributeOverride(name = "repairEnergyCostRate", column = @Column(name = "damage_flow_repair_energy_cost_rate", nullable = false))
    })
    private DamageFlowEntity damageFlow = new DamageFlowEntity();
}


