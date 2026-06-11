package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Genome;
import com.hellengi.biolab.dto.GenomeDto;
import com.hellengi.biolab.dto.GenomeSettingsDto;
import com.hellengi.biolab.dto.RangedValueDto;
import com.hellengi.biolab.dto.mapper.GenomeDefaults;
import com.hellengi.biolab.dto.mapper.GenomeValues;
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
                genome.getCytosolArea(),
                genome.getCytosolDensity(),
                genome.isBioluminescenceEnabled(),
                genome.getBioluminescence(),
                genome.getElasticity(),
                genome.isMelaninEnabled(),
                genome.getMelaninPercent(),
                genome.isChloroplastEnabled(),
                genome.getChloroplastAmount(),
                genome.getChlorophyll(),
                genome.getCarotenoids(),
                genome.isLysosomeEnabled(),
                genome.getLysosomeAmount(),
                genome.getLysosomeEnzymeActivity(),
                genome.isFlagellumEnabled(),
                genome.getFlagellumCount(),
                genome.getFlagellumLength(),
                genome.getFlagellumMotorPower(),
                genome.getFlagellumPairSpreadAngle(),
                genome.getFlagellumSteeringAsymmetry(),
                genome.getCode()
        );
    }

    public Genome toDomain(GenomeDto dto) {
        GenomeValues values = defaults.normalize(dto);
        return new Genome(
                values.divisionThreshold(),
                values.divisionImpulse(),
                values.divisionAngle(),
                values.cytosolArea(),
                values.cytosolDensity(),
                values.bioluminescenceEnabled(),
                values.bioluminescence(),
                values.elasticity(),
                values.melaninEnabled(),
                values.melaninPercent(),
                values.chloroplastEnabled(),
                values.chloroplastAmount(),
                values.chlorophyll(),
                values.carotenoids(),
                values.lysosomeEnabled(),
                values.lysosomeAmount(),
                values.lysosomeEnzymeActivity(),
                values.flagellumEnabled(),
                values.flagellumCount(),
                values.flagellumLength(),
                values.flagellumMotorPower(),
                values.flagellumPairSpreadAngle(),
                values.flagellumSteeringAsymmetry()
        );
    }

    public GenomeSettingsDto toSettingsDto(YamlConfig.GenomeProperties genome) {
        return new GenomeSettingsDto(
                control(genome.getDivisionThreshold()),
                control(genome.getDivisionImpulse()),
                control(genome.getDivisionAngle()),
                control(genome.getStartNucleusDamage()),
                control(genome.getStartCytosolDamage()),
                control(genome.getStartCpDamage()),
                control(genome.getStartMembraneDamage()),
                control(genome.getStartLysosomeDamage()),
                control(genome.getStartFlagellumDamage()),
                control(genome.getCytosolArea()),
                control(genome.getCytosolDensity()),
                genome.isBioluminescenceEnabledInitial(),
                control(genome.getBioluminescence()),
                control(genome.getElasticity()),
                genome.isMelaninEnabledInitial(),
                control(genome.getMelaninPercent()),
                genome.isChloroplastEnabledInitial(),
                control(genome.getChloroplastAmount()),
                control(genome.getChlorophyll()),
                control(genome.getCarotenoids()),
                genome.isLysosomeEnabledInitial(),
                control(genome.getLysosomeAmount()),
                control(genome.getLysosomeEnzymeActivity()),
                genome.isFlagellumEnabledInitial(),
                control(genome.getFlagellumCount()),
                control(genome.getFlagellumLength()),
                control(genome.getFlagellumMotorPower()),
                control(genome.getFlagellumPairSpreadAngle()),
                control(genome.getFlagellumSteeringAsymmetry()),
                null
        );
    }

    private RangedValueDto control(YamlConfig.Control control) {
        return new RangedValueDto(
                control.getInitial(), control.getMin(), control.getMax(), control.getStep(), control.getInitial(), control.getScale()
        );
    }
}
