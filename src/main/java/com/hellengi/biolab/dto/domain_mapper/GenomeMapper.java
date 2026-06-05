package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Genome;
import com.hellengi.biolab.dto.GenomeDto;
import com.hellengi.biolab.dto.GenomeSettingsDto;
import com.hellengi.biolab.dto.RangedValueDto;
import com.hellengi.biolab.dto.mapper.GenomeDefaults;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GenomeMapper {
    private final GenomeDefaults defaults;

    public GenomeDto toDto(Genome genome) {
        return new GenomeDto(
                genome.getDivisionThreshold(),
                genome.getDivisionImpulse(),
                genome.getDivisionAngle(),
                genome.getMaxEnergy(),
                genome.getDryMass(),
                genome.getElasticity(),
                genome.getGfp(),
                genome.isMelaninEnabled(),
                genome.getMelaninPercent(),
                genome.isChloroplastEnabled(),
                genome.getChloroplastAmount(),
                genome.getChlorophyll(),
                genome.getCarotenoids(),
                genome.isLysosomeEnabled(),
                genome.getLysosomeAmount(),
                genome.getLysosomeEnzymeActivity(),
                genome.getCode()
        );
    }

    public Genome toDomain(GenomeDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Genome must not be null");
        }
        return new Genome(
                dto.divisionThreshold(),
                dto.divisionImpulse(),
                dto.divisionAngle(),
                dto.maxEnergy(),
                defaults.dryMass(dto.dryMass()),
                defaults.elasticity(dto.elasticity()),
                defaults.gfp(dto.gfp()),
                dto.melaninEnabled(),
                defaults.melaninPercent(dto.melaninPercent()),
                dto.chloroplastEnabled(),
                defaults.chloroplastAmount(dto.chloroplastAmount()),
                defaults.chlorophyll(dto.chlorophyll()),
                defaults.carotenoids(dto.carotenoids()),
                dto.lysosomeEnabled(),
                defaults.lysosomeAmount(dto.lysosomeAmount()),
                defaults.lysosomeEnzymeActivity(dto.lysosomeEnzymeActivity())
        );
    }

    public GenomeSettingsDto toSettingsDto(YamlConfig.GenomeProperties genome) {
        return new GenomeSettingsDto(
                control(genome.getDivisionThreshold()),
                control(genome.getDivisionImpulse()),
                control(genome.getDivisionAngle()),
                control(genome.getStartCellDamage()),
                control(genome.getMaxEnergy()),
                control(genome.getDryMass()),
                control(genome.getElasticity()),
                control(genome.getGfp()),
                genome.isMelaninEnabledInitial(),
                control(genome.getMelaninPercent()),
                genome.isChloroplastEnabledInitial(),
                control(genome.getChloroplastAmount()),
                control(genome.getChlorophyll()),
                control(genome.getCarotenoids()),
                control(genome.getStartCpDamage()),
                genome.isLysosomeEnabledInitial(),
                control(genome.getLysosomeAmount()),
                control(genome.getLysosomeEnzymeActivity()),
                null
        );
    }

    private RangedValueDto control(YamlConfig.Control control) {
        return new RangedValueDto(
                control.getInitial(), control.getMin(), control.getMax(), control.getStep(), control.getInitial()
        );
    }

}
