package com.hellengi.biolab.database.entity.snapshot;

import com.hellengi.biolab.database.entity.common.DamageFlowEntity;
import com.hellengi.biolab.database.entity.common.LayoutStateEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "snapshot_cell_nucleus_state")
public class SnapshotCellNucleusStateEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cell_id", nullable = false)
    private SnapshotCellEntity cell;

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
            @AttributeOverride(name = "damage", column = @Column(name = "damage_flow_damage", nullable = false)),
            @AttributeOverride(name = "damageRate", column = @Column(name = "damage_flow_damage_rate", nullable = false)),
            @AttributeOverride(name = "repairRate", column = @Column(name = "damage_flow_repair_rate", nullable = false)),
            @AttributeOverride(name = "repairEnergyCostRate", column = @Column(name = "damage_flow_repair_energy_cost_rate", nullable = false))
    })
    private DamageFlowEntity damageFlow = new DamageFlowEntity();

    @Column(nullable = false)
    private double radius;
}




