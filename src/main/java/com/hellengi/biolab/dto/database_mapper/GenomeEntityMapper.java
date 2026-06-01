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
                dto.divisionThreshold(), dto.divisionImpulse(), dto.divisionAngle(),
                dto.colorHue(), dto.saturation(), dto.lightness(), dto.maxEnergy(),
                dryMassOrDefault(dto.dryMass()), elasticityOrDefault(dto.elasticity())
        );
    }

    public GenomeDto toDto(GenomeEmbeddable genome) {
        return new GenomeDto(
                genome.getDivisionThreshold(), genome.getDivisionImpulse(), genome.getDivisionAngle(),
                genome.getColorHue(), genome.getSaturation(), genome.getLightness(), genome.getMaxEnergy(),
                genome.getDryMass(), genome.getElasticity(), null
        );
    }

    private double dryMassOrDefault(Double dryMass) {
        return dryMass != null ? dryMass : config.getGenome().getDryMass().getInitial();
    }

    private double elasticityOrDefault(Double elasticity) {
        return elasticity != null ? elasticity : config.getGenome().getElasticity().getInitial();
    }
}
