package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Genome;
import com.hellengi.biolab.dto.GenomeDto;
import com.hellengi.biolab.dto.GenomeSettingsDto;
import com.hellengi.biolab.dto.RangedValueDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GenomeMapper {
    private final YamlConfig config;

    public GenomeDto toDto(Genome genome) {
        return new GenomeDto(
                genome.getDivisionThreshold(),
                genome.getDivisionImpulse(),
                genome.getDivisionAngle(),
                genome.getColorHue(),
                genome.getSaturation(),
                genome.getLightness(),
                genome.getMaxEnergy(),
                genome.getDryMass(),
                genome.getElasticity(),
                genome.getCode()
        );
    }

    public Genome toDomain(GenomeDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Genome must not be null");
        }
        return new Genome(
                dto.divisionThreshold(), dto.divisionImpulse(), dto.divisionAngle(),
                dto.colorHue(), dto.saturation(), dto.lightness(), dto.maxEnergy(),
                dryMassOrDefault(dto.dryMass()), elasticityOrDefault(dto.elasticity())
        );
    }

    public GenomeSettingsDto toSettingsDto(YamlConfig.GenomeProperties genome) {
        return new GenomeSettingsDto(
                control(genome.getDivisionThreshold()), control(genome.getDivisionImpulse()),
                control(genome.getDivisionAngle()), control(genome.getColorHue()),
                control(genome.getSaturation()), control(genome.getLightness()),
                control(genome.getMaxEnergy()), control(genome.getDryMass()),
                control(genome.getElasticity()), null
        );
    }

    private RangedValueDto control(YamlConfig.Control control) {
        return new RangedValueDto(
                control.getInitial(), control.getMin(), control.getMax(), control.getStep(), control.getInitial()
        );
    }

    private double dryMassOrDefault(Double dryMass) {
        return dryMass != null ? dryMass : config.getGenome().getDryMass().getInitial();
    }

    private double elasticityOrDefault(Double elasticity) {
        return elasticity != null ? elasticity : config.getGenome().getElasticity().getInitial();
    }
}