package com.hellengi.biolab.simulation.mapper;

import com.hellengi.biolab.api.dto.GenomeDto;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.persistence.entity.GenomeEmbeddable;
import org.springframework.stereotype.Component;

@Component
public class GenomeMapper {

    public GenomeDto toDto(Genome genome) {
        return new GenomeDto(
                genome.getDivisionThreshold(),
                genome.getDivisionImpulseStrength(),
                genome.getColorHue(),
                genome.getSaturation(),
                genome.getLightness(),
                genome.getMaxEnergy(),
                genome.getCode()
        );
    }

    public GenomeDto toDto(GenomeEmbeddable genome) {
        return new GenomeDto(
                genome.getDivisionThreshold(),
                genome.getDivisionImpulseStrength(),
                genome.getColorHue(),
                genome.getSaturation(),
                genome.getLightness(),
                genome.getMaxEnergy(),
                null
        );
    }

    public GenomeDto toDto(YamlConfig.GenomeProperties.InitialGenome genome) {
        return new GenomeDto(
                genome.getDivisionThreshold(),
                genome.getDivisionImpulse(),
                genome.getColorHue(),
                genome.getSaturation(),
                genome.getLightness(),
                genome.getMaxEnergy(),
                null
        );
    }

    public Genome toDomain(GenomeDto dto) {
        return new Genome(
                dto.divisionThreshold(),
                dto.divisionImpulseStrength(),
                dto.colorHue(),
                dto.saturation(),
                dto.lightness(),
                dto.maxEnergy()
        );
    }

    public Genome toDomain(YamlConfig.GenomeProperties.InitialGenome genome) {
        return new Genome(
                genome.getDivisionThreshold(),
                genome.getDivisionImpulse(),
                genome.getColorHue(),
                genome.getSaturation(),
                genome.getLightness(),
                genome.getMaxEnergy()
        );
    }

    public GenomeEmbeddable toSnapshot(GenomeDto dto) {
        return new GenomeEmbeddable(
                dto.divisionThreshold(),
                dto.divisionImpulseStrength(),
                dto.colorHue(),
                dto.saturation(),
                dto.lightness(),
                dto.maxEnergy()
        );
    }
}