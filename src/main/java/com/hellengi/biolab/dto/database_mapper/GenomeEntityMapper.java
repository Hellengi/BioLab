
package com.hellengi.biolab.dto.database_mapper;

import com.hellengi.biolab.dto.mapper.GenomeDefaults;
import com.hellengi.biolab.database.entity.genome.*;
import com.hellengi.biolab.dto.GenomeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GenomeEntityMapper {
    private final GenomeDefaults defaults;

    public GenomeEntity toEntity(GenomeDto dto) {
        GenomeEntity genome = new GenomeEntity();

        NucleusEntity nucleus = new NucleusEntity();
        nucleus.setDivisionThreshold(dto.divisionThreshold());
        nucleus.setDivisionImpulse(dto.divisionImpulse());
        nucleus.setDivisionAngle(dto.divisionAngle());
        genome.setNucleus(nucleus);

        CytosolEntity cytosol = new CytosolEntity();
        cytosol.setArea(defaults.cytosolArea(dto.cytosolArea()));
        cytosol.setDensity(defaults.cytosolDensity(dto.cytosolDensity()));
        cytosol.setGfpEnabled(dto.gfpEnabled());
        cytosol.setGfp(defaults.gfp(dto.gfp()));
        genome.setCytosol(cytosol);

        MembraneEntity membrane = new MembraneEntity();
        membrane.setElasticity(defaults.elasticity(dto.elasticity()));
        membrane.setMelaninEnabled(dto.melaninEnabled());
        membrane.setMelaninPercent(defaults.melaninPercent(dto.melaninPercent()));
        genome.setMembrane(membrane);

        ChloroplastsEntity chloroplasts = new ChloroplastsEntity();
        chloroplasts.setEnabled(dto.chloroplastEnabled());
        chloroplasts.setAmount(defaults.chloroplastAmount(dto.chloroplastAmount()));
        chloroplasts.setChlorophyll(defaults.chlorophyll(dto.chlorophyll()));
        chloroplasts.setCarotenoids(defaults.carotenoids(dto.carotenoids()));
        genome.setChloroplasts(chloroplasts);

        LysosomesEntity lysosomes = new LysosomesEntity();
        lysosomes.setEnabled(dto.lysosomeEnabled());
        lysosomes.setAmount(defaults.lysosomeAmount(dto.lysosomeAmount()));
        lysosomes.setEnzymeActivity(defaults.lysosomeEnzymeActivity(dto.lysosomeEnzymeActivity()));
        genome.setLysosomes(lysosomes);

        FlagellaEntity flagella = new FlagellaEntity();
        flagella.setEnabled(dto.flagellumEnabled());
        flagella.setCount((int) defaults.flagellumCount(dto.flagellumCount()));
        flagella.setLength(defaults.flagellumLength(dto.flagellumLength()));
        flagella.setMotorPower(defaults.flagellumMotorPower(dto.flagellumMotorPower()));
        flagella.setPairSpreadAngle(defaults.flagellumPairSpreadAngle(dto.flagellumPairSpreadAngle()));
        flagella.setSteeringAsymmetry(defaults.flagellumSteeringAsymmetry(dto.flagellumSteeringAsymmetry()));
        genome.setFlagella(flagella);

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
                cytosol.isGfpEnabled(),
                cytosol.getGfp(),
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
                flagella != null && flagella.isEnabled(),
                flagella != null ? (double) flagella.getCount() : 1.0,
                flagella != null ? flagella.getLength() : 1.8,
                flagella != null ? flagella.getMotorPower() : 30.0,
                flagella != null ? flagella.getPairSpreadAngle() : 36.0,
                flagella != null ? flagella.getSteeringAsymmetry() : 0.0,
                null
        );
    }
}

