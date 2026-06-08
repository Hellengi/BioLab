package com.hellengi.biolab.database.entity.snapshot;

import com.hellengi.biolab.database.entity.SnapshotEntity;
import com.hellengi.biolab.database.entity.common.EnergyFlowEntity;
import com.hellengi.biolab.database.entity.common.PhysicalStateEntity;
import com.hellengi.biolab.database.entity.genome.GenomeEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "snapshot_cell")
public class SnapshotCellEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "snapshot_id", nullable = false)
    private SnapshotEntity snapshot;

    @Column(nullable = false)
    private int positionInSnapshot;

    @Column(nullable = false)
    private long worldCellId;

    @Column(nullable = false)
    private boolean alive;

    @Column(nullable = false)
    private long lifetimeTicks;

    @Column(nullable = false)
    private double localLight;
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

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "genome_id", nullable = false)
    private GenomeEntity genome = new GenomeEntity();

    @OneToOne(mappedBy = "cell", cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    private SnapshotCellNucleusStateEntity nucleusState = new SnapshotCellNucleusStateEntity();

    @OneToOne(mappedBy = "cell", cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    private SnapshotCellCytosolStateEntity cytosolState = new SnapshotCellCytosolStateEntity();

    @OneToOne(mappedBy = "cell", cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    private SnapshotCellMembraneStateEntity membraneState = new SnapshotCellMembraneStateEntity();

    @OneToOne(mappedBy = "cell", cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    private SnapshotCellChloroplastsStateEntity chloroplastsState = new SnapshotCellChloroplastsStateEntity();

    @OneToOne(mappedBy = "cell", cascade = CascadeType.ALL, orphanRemoval = true, optional = false)
    private SnapshotCellLysosomesStateEntity lysosomesState = new SnapshotCellLysosomesStateEntity();

    @OneToMany(mappedBy = "cell", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("slotIndex ASC")
    private List<SnapshotLysosomeSlotEntity> lysosomeSlots = new ArrayList<>();

    @OneToMany(mappedBy = "cell", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("slotIndex ASC")
    private List<SnapshotFlagellumSlotEntity> flagellumSlots = new ArrayList<>();

    @OneToMany(mappedBy = "cell", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("positionInCell ASC")
    private List<SnapshotCellEventEntity> events = new ArrayList<>();

    public void setNucleusState(SnapshotCellNucleusStateEntity nucleusState) {
        this.nucleusState = nucleusState;
        if (nucleusState != null) nucleusState.setCell(this);
    }

    public void setCytosolState(SnapshotCellCytosolStateEntity cytosolState) {
        this.cytosolState = cytosolState;
        if (cytosolState != null) cytosolState.setCell(this);
    }

    public void setMembraneState(SnapshotCellMembraneStateEntity membraneState) {
        this.membraneState = membraneState;
        if (membraneState != null) membraneState.setCell(this);
    }

    public void setChloroplastsState(SnapshotCellChloroplastsStateEntity chloroplastsState) {
        this.chloroplastsState = chloroplastsState;
        if (chloroplastsState != null) chloroplastsState.setCell(this);
    }

    public void setLysosomesState(SnapshotCellLysosomesStateEntity lysosomesState) {
        this.lysosomesState = lysosomesState;
        if (lysosomesState != null) lysosomesState.setCell(this);
    }

    public void addLysosomeSlot(SnapshotLysosomeSlotEntity slot) {
        lysosomeSlots.add(slot);
        slot.setCell(this);
    }

    public void addFlagellumSlot(SnapshotFlagellumSlotEntity slot) {
        flagellumSlots.add(slot);
        slot.setCell(this);
    }

    public void addEvent(SnapshotCellEventEntity event) {
        events.add(event);
        event.setCell(this);
    }
}


