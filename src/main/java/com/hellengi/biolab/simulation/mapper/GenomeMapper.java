package com.hellengi.biolab.simulation.mapper;

import com.hellengi.biolab.api.dto.RangedValueDto;
import com.hellengi.biolab.api.dto.GenomeDto;
import com.hellengi.biolab.api.dto.GenomeSettingsDto;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.persistence.entity.GenomeEmbeddable;
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

    public GenomeDto toDto(GenomeEmbeddable genome) {
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
                null
        );
    }

    public GenomeSettingsDto toSettingsDto(YamlConfig.GenomeProperties genome) {
        return new GenomeSettingsDto(
                control(genome.getDivisionThreshold()),
                control(genome.getDivisionImpulse()),
                control(genome.getDivisionAngle()),
                control(genome.getColorHue()),
                control(genome.getSaturation()),
                control(genome.getLightness()),
                control(genome.getMaxEnergy()),
                control(genome.getDryMass()),
                control(genome.getElasticity()),
                null
        );
    }

    public Genome toDomain(GenomeDto dto) {
        return new Genome(
                dto.divisionThreshold(),
                dto.divisionImpulse(),
                dto.divisionAngle(),
                dto.colorHue(),
                dto.saturation(),
                dto.lightness(),
                dto.maxEnergy(),
                dryMassOrDefault(dto.dryMass()),
                elasticityOrDefault(dto.elasticity())
        );
    }

    public Genome toDomain(YamlConfig.GenomeProperties genome) {
        return new Genome(
                genome.getDivisionThreshold().getInitial(),
                genome.getDivisionImpulse().getInitial(),
                genome.getDivisionAngle().getInitial(),
                genome.getColorHue().getInitial(),
                genome.getSaturation().getInitial(),
                genome.getLightness().getInitial(),
                genome.getMaxEnergy().getInitial(),
                genome.getDryMass().getInitial(),
                genome.getElasticity().getInitial()
        );
    }

    private RangedValueDto control(YamlConfig.Control control) {
        return new RangedValueDto(
                control.getInitial(),
                control.getMin(),
                control.getMax(),
                control.getStep(),
                control.getInitial()
        );
    }

    public GenomeEmbeddable toSnapshot(GenomeDto dto) {
        return new GenomeEmbeddable(
                dto.divisionThreshold(),
                dto.divisionImpulse(),
                dto.divisionAngle(),
                dto.colorHue(),
                dto.saturation(),
                dto.lightness(),
                dto.maxEnergy(),
                dryMassOrDefault(dto.dryMass()),
                elasticityOrDefault(dto.elasticity())
        );
    }

    private double dryMassOrDefault(Double dryMass) {
        return dryMass != null ? dryMass : config.getGenome().getDryMass().getInitial();
    }

    private double elasticityOrDefault(Double elasticity) {
        return elasticity != null ? elasticity : config.getGenome().getElasticity().getInitial();
    }
}