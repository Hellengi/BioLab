package com.hellengi.biolab.dto.database_mapper;

import com.hellengi.biolab.database.entity.genome.ChloroplastsEntity;
import com.hellengi.biolab.database.entity.genome.CytosolEntity;
import com.hellengi.biolab.database.entity.genome.FlagellaEntity;
import com.hellengi.biolab.database.entity.genome.GenomeEntity;
import com.hellengi.biolab.database.entity.genome.LysosomesEntity;
import com.hellengi.biolab.database.entity.genome.MembraneEntity;
import com.hellengi.biolab.database.entity.genome.NucleusEntity;
import com.hellengi.biolab.dto.GenomeDto;
import com.hellengi.biolab.dto.mapper.GenomeDefaults;
import com.hellengi.biolab.dto.mapper.GenomeValues;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GenomeEntityMapper {
    private static final double DEFAULT_FLAGELLUM_COUNT = 1.0;
    private static final double DEFAULT_FLAGELLUM_LENGTH = 1.8;
    private static final double DEFAULT_FLAGELLUM_MOTOR_POWER = 30.0;
    private static final double DEFAULT_FLAGELLUM_PAIR_SPREAD_ANGLE = 36.0;
    private static final double DEFAULT_FLAGELLUM_STEERING_ASYMMETRY = 0.0;

    private final GenomeDefaults defaults;

    public GenomeEntity toEntity(GenomeDto dto) {
        GenomeValues values = defaults.normalize(dto);
        GenomeEntity genome = new GenomeEntity();
        genome.setNucleus(nucleus(values));
        genome.setCytosol(cytosol(values));
        genome.setMembrane(membrane(values));
        genome.setChloroplasts(chloroplasts(values));
        genome.setLysosomes(lysosomes(values));
        genome.setFlagella(flagella(values));
        return genome;
    }

    public GenomeDto toDto(GenomeEntity genome) {
        if (genome == null) {
            throw new IllegalArgumentException("Genome entity must not be null");
        }
        NucleusEntity nucleus = genome.getNucleus();
        CytosolEntity cytosol = genome.getCytosol();
        MembraneEntity membrane = genome.getMembrane();
        ChloroplastsEntity chloroplasts = genome.getChloroplasts();
        LysosomesEntity lysosomes = genome.getLysosomes();
        FlagellaEntity flagella = genome.getFlagella();

        return new GenomeDto(
                nucleus.getDivisionThreshold(),
                nucleus.getDivisionImpulse(),
                nucleus.getDivisionAngle(),
                cytosol.getArea(),
                cytosol.getDensity(),
                cytosol.isBioluminescenceEnabled(),
                cytosol.getBioluminescence(),
                membrane.getElasticity(),
                membrane.isMelaninEnabled(),
                membrane.getMelaninPercent(),
                chloroplasts.isEnabled(),
                chloroplasts.getAmount(),
                chloroplasts.getChlorophyll(),
                chloroplasts.getCarotenoids(),
                lysosomes.isEnabled(),
                lysosomes.getAmount(),
                lysosomes.getEnzymeActivity(),
                flagellaEnabled(flagella),
                flagellaCount(flagella),
                flagellaLength(flagella),
                flagellaMotorPower(flagella),
                flagellaPairSpreadAngle(flagella),
                flagellaSteeringAsymmetry(flagella),
                null
        );
    }

    private NucleusEntity nucleus(GenomeValues values) {
        NucleusEntity entity = new NucleusEntity();
        entity.setDivisionThreshold(values.divisionThreshold());
        entity.setDivisionImpulse(values.divisionImpulse());
        entity.setDivisionAngle(values.divisionAngle());
        return entity;
    }

    private CytosolEntity cytosol(GenomeValues values) {
        CytosolEntity entity = new CytosolEntity();
        entity.setArea(values.cytosolArea());
        entity.setDensity(values.cytosolDensity());
        entity.setBioluminescenceEnabled(values.bioluminescenceEnabled());
        entity.setBioluminescence(values.bioluminescence());
        return entity;
    }

    private MembraneEntity membrane(GenomeValues values) {
        MembraneEntity entity = new MembraneEntity();
        entity.setElasticity(values.elasticity());
        entity.setMelaninEnabled(values.melaninEnabled());
        entity.setMelaninPercent(values.melaninPercent());
        return entity;
    }

    private ChloroplastsEntity chloroplasts(GenomeValues values) {
        ChloroplastsEntity entity = new ChloroplastsEntity();
        entity.setEnabled(values.chloroplastEnabled());
        entity.setAmount(values.chloroplastAmount());
        entity.setChlorophyll(values.chlorophyll());
        entity.setCarotenoids(values.carotenoids());
        return entity;
    }

    private LysosomesEntity lysosomes(GenomeValues values) {
        LysosomesEntity entity = new LysosomesEntity();
        entity.setEnabled(values.lysosomeEnabled());
        entity.setAmount(values.lysosomeAmount());
        entity.setEnzymeActivity(values.lysosomeEnzymeActivity());
        return entity;
    }

    private FlagellaEntity flagella(GenomeValues values) {
        FlagellaEntity entity = new FlagellaEntity();
        entity.setEnabled(values.flagellumEnabled());
        entity.setCount((int) values.flagellumCount());
        entity.setLength(values.flagellumLength());
        entity.setMotorPower(values.flagellumMotorPower());
        entity.setPairSpreadAngle(values.flagellumPairSpreadAngle());
        entity.setSteeringAsymmetry(values.flagellumSteeringAsymmetry());
        return entity;
    }

    private boolean flagellaEnabled(FlagellaEntity flagella) {
        return flagella != null && flagella.isEnabled();
    }

    private double flagellaCount(FlagellaEntity flagella) {
        return flagella != null ? flagella.getCount() : DEFAULT_FLAGELLUM_COUNT;
    }

    private double flagellaLength(FlagellaEntity flagella) {
        return flagella != null ? flagella.getLength() : DEFAULT_FLAGELLUM_LENGTH;
    }

    private double flagellaMotorPower(FlagellaEntity flagella) {
        return flagella != null ? flagella.getMotorPower() : DEFAULT_FLAGELLUM_MOTOR_POWER;
    }

    private double flagellaPairSpreadAngle(FlagellaEntity flagella) {
        return flagella != null ? flagella.getPairSpreadAngle() : DEFAULT_FLAGELLUM_PAIR_SPREAD_ANGLE;
    }

    private double flagellaSteeringAsymmetry(FlagellaEntity flagella) {
        return flagella != null ? flagella.getSteeringAsymmetry() : DEFAULT_FLAGELLUM_STEERING_ASYMMETRY;
    }
}
