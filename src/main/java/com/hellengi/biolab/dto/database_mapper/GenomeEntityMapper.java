package com.hellengi.biolab.dto.database_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.database.entity.genome.*;
import com.hellengi.biolab.dto.GenomeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GenomeEntityMapper {
    private final YamlConfig config;

    public GenomeEntity toEntity(GenomeDto dto) {
        GenomeEntity genome = new GenomeEntity();

        NucleusEntity nucleus = new NucleusEntity();
        nucleus.setDivisionThreshold(dto.divisionThreshold());
        nucleus.setDivisionImpulse(dto.divisionImpulse());
        nucleus.setDivisionAngle(dto.divisionAngle());
        genome.setNucleus(nucleus);

        CytosolEntity cytosol = new CytosolEntity();
        cytosol.setMaxEnergy(dto.maxEnergy());
        cytosol.setDryMass(dryMassOrDefault(dto.dryMass()));
        cytosol.setGfp(gfpOrDefault(dto.gfp()));
        genome.setCytosol(cytosol);

        MembraneEntity membrane = new MembraneEntity();
        membrane.setElasticity(elasticityOrDefault(dto.elasticity()));
        membrane.setMelaninEnabled(dto.melaninEnabled());
        membrane.setMelaninPercent(melaninPercentOrDefault(dto.melaninPercent()));
        genome.setMembrane(membrane);

        ChloroplastsEntity chloroplasts = new ChloroplastsEntity();
        chloroplasts.setEnabled(dto.chloroplastEnabled());
        chloroplasts.setAmount(chloroplastAmountOrDefault(dto.chloroplastAmount()));
        chloroplasts.setChlorophyll(chlorophyllOrDefault(dto.chlorophyll()));
        chloroplasts.setCarotenoids(carotenoidsOrDefault(dto.carotenoids()));
        genome.setChloroplasts(chloroplasts);

        LysosomesEntity lysosomes = new LysosomesEntity();
        lysosomes.setEnabled(dto.lysosomeEnabled());
        lysosomes.setAmount(lysosomeAmountOrDefault(dto.lysosomeAmount()));
        lysosomes.setEnzymeActivity(lysosomeEnzymeActivityOrDefault(dto.lysosomeEnzymeActivity()));
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

    private double dryMassOrDefault(Double dryMass) {
        return dryMass != null ? dryMass : config.getGenome().getDryMass().getInitial();
    }

    private double elasticityOrDefault(Double elasticity) {
        return elasticity != null ? elasticity : config.getGenome().getElasticity().getInitial();
    }

    private double gfpOrDefault(Double gfp) {
        return gfp != null ? gfp : config.getGenome().getGfp().getInitial();
    }

    private double melaninPercentOrDefault(Double value) {
        return value != null ? value : config.getGenome().getMelaninPercent().getInitial();
    }

    private double chloroplastAmountOrDefault(Double value) {
        return value != null ? value : config.getGenome().getChloroplastAmount().getInitial();
    }

    private double chlorophyllOrDefault(Double value) {
        double raw = value != null ? value : config.getGenome().getChlorophyll().getInitial();
        return Math.max(config.getGenome().getChlorophyll().getMin(), raw);
    }

    private double carotenoidsOrDefault(Double value) {
        return value != null ? value : config.getGenome().getCarotenoids().getInitial();
    }

    private double lysosomeAmountOrDefault(Double value) {
        return value != null ? value : config.getGenome().getLysosomeAmount().getInitial();
    }

    private double lysosomeEnzymeActivityOrDefault(Double value) {
        return value != null ? value : config.getGenome().getLysosomeEnzymeActivity().getInitial();
    }
}
