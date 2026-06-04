package com.hellengi.biolab.dto.database_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.database.entity.GenomeEmbeddable;
import com.hellengi.biolab.dto.GenomeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GenomeEntityMapper {
    private final YamlConfig config;

    public GenomeEmbeddable toEntity(GenomeDto dto) {
        return new GenomeEmbeddable(
                dto.divisionThreshold(), dto.divisionImpulse(), dto.divisionAngle(), dto.maxEnergy(),
                dryMassOrDefault(dto.dryMass()), elasticityOrDefault(dto.elasticity()), gfpOrDefault(dto.gfp()),
                dto.melaninEnabled(), melaninPercentOrDefault(dto.melaninPercent()),
                dto.chloroplastEnabled(), chloroplastAmountOrDefault(dto.chloroplastAmount()),
                chlorophyllOrDefault(dto.chlorophyll()), carotenoidsOrDefault(dto.carotenoids()),
                dto.lysosomeEnabled(), lysosomeAmountOrDefault(dto.lysosomeAmount()),
                lysosomeEnzymeActivityOrDefault(dto.lysosomeEnzymeActivity())
        );
    }

    public GenomeDto toDto(GenomeEmbeddable genome) {
        return new GenomeDto(
                genome.getDivisionThreshold(), genome.getDivisionImpulse(), genome.getDivisionAngle(),
                genome.getMaxEnergy(), genome.getDryMass(), genome.getElasticity(), genome.getGfp(),
                genome.isMelaninEnabled(), genome.getMelaninPercent(),
                genome.isChloroplastEnabled(), genome.getChloroplastAmount(), genome.getChlorophyll(),
                genome.getCarotenoids(), genome.isLysosomeEnabled(), genome.getLysosomeAmount(),
                genome.getLysosomeEnzymeActivity(), null
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

