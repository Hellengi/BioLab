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
        cytosol.setMaxEnergy(dto.maxEnergy());
        cytosol.setDryMass(defaults.dryMass(dto.dryMass()));
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

        return new GenomeDto(
                nucleus.getDivisionThreshold(),
                nucleus.getDivisionImpulse(),
                nucleus.getDivisionAngle(),
                cytosol.getMaxEnergy(),
                cytosol.getDryMass(),
                membrane.getElasticity(),
                cytosol.getGfp(),
                membrane.isMelaninEnabled(),
                membrane.getMelaninPercent(),
                chloroplasts.isEnabled(),
                chloroplasts.getAmount(),
                chloroplasts.getChlorophyll(),
                chloroplasts.getCarotenoids(),
                lysosomes.isEnabled(),
                lysosomes.getAmount(),
                lysosomes.getEnzymeActivity(),
                null
        );
    }

}
