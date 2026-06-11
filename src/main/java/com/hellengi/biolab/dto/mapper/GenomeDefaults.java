package com.hellengi.biolab.dto.mapper;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.dto.GenomeDto;
import com.hellengi.biolab.util.ControlScale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GenomeDefaults {
    private final YamlConfig config;


    public GenomeValues normalize(GenomeDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Genome must not be null");
        }
        return new GenomeValues(
                dto.divisionThreshold(),
                dto.divisionImpulse(),
                dto.divisionAngle(),
                cytosolArea(dto.cytosolArea()),
                cytosolDensity(dto.cytosolDensity()),
                dto.bioluminescenceEnabled(),
                bioluminescence(dto.bioluminescence()),
                elasticity(dto.elasticity()),
                dto.melaninEnabled(),
                melaninPercent(dto.melaninPercent()),
                dto.chloroplastEnabled(),
                chloroplastAmount(dto.chloroplastAmount()),
                chlorophyll(dto.chlorophyll()),
                carotenoids(dto.carotenoids()),
                dto.lysosomeEnabled(),
                lysosomeAmount(dto.lysosomeAmount()),
                lysosomeEnzymeActivity(dto.lysosomeEnzymeActivity()),
                dto.flagellumEnabled(),
                flagellumCount(dto.flagellumCount()),
                flagellumLength(dto.flagellumLength()),
                flagellumMotorPower(dto.flagellumMotorPower()),
                flagellumPairSpreadAngle(dto.flagellumPairSpreadAngle()),
                flagellumSteeringAsymmetry(dto.flagellumSteeringAsymmetry())
        );
    }

    public double cytosolArea(Double value) {
        double raw = value != null ? value : config.getGenome().getCytosolArea().getInitial();
        return clamp(raw, config.getGenome().getCytosolArea());
    }

    public double cytosolDensity(Double value) {
        double raw = value != null ? value : config.getGenome().getCytosolDensity().getInitial();
        return clamp(raw, config.getGenome().getCytosolDensity());
    }

    public double elasticity(Double value) {
        double raw = value != null ? value : config.getGenome().getElasticity().getInitial();
        return clamp(raw, config.getGenome().getElasticity());
    }

    public double bioluminescence(Double value) {
        double raw = value != null ? value : config.getGenome().getBioluminescence().getInitial();
        return clamp(raw, config.getGenome().getBioluminescence());
    }

    public double melaninPercent(Double value) {
        double raw = value != null ? value : config.getGenome().getMelaninPercent().getInitial();
        return clamp(raw, config.getGenome().getMelaninPercent());
    }

    public double chloroplastAmount(Double value) {
        double raw = value != null ? value : config.getGenome().getChloroplastAmount().getInitial();
        return clamp(raw, config.getGenome().getChloroplastAmount());
    }

    public double chlorophyll(Double value) {
        double raw = value != null ? value : config.getGenome().getChlorophyll().getInitial();
        return clamp(raw, config.getGenome().getChlorophyll());
    }

    public double carotenoids(Double value) {
        double raw = value != null ? value : config.getGenome().getCarotenoids().getInitial();
        return clamp(raw, config.getGenome().getCarotenoids());
    }

    public double lysosomeAmount(Double value) {
        double raw = value != null ? value : config.getGenome().getLysosomeAmount().getInitial();
        return clamp(raw, config.getGenome().getLysosomeAmount());
    }

    public double lysosomeEnzymeActivity(Double value) {
        double raw = value != null ? value : config.getGenome().getLysosomeEnzymeActivity().getInitial();
        return clamp(raw, config.getGenome().getLysosomeEnzymeActivity());
    }

    public double flagellumCount(Double value) {
        double raw = value != null ? value : config.getGenome().getFlagellumCount().getInitial();
        return Math.round(clamp(raw, config.getGenome().getFlagellumCount()));
    }

    public double flagellumLength(Double value) {
        double raw = value != null ? value : config.getGenome().getFlagellumLength().getInitial();
        return clamp(raw, config.getGenome().getFlagellumLength());
    }

    public double flagellumMotorPower(Double value) {
        double raw = value != null ? value : config.getGenome().getFlagellumMotorPower().getInitial();
        return clamp(raw, config.getGenome().getFlagellumMotorPower());
    }


    public double flagellumPairSpreadAngle(Double value) {
        double raw = value != null ? value : config.getGenome().getFlagellumPairSpreadAngle().getInitial();
        return clamp(raw, config.getGenome().getFlagellumPairSpreadAngle());
    }

    public double flagellumSteeringAsymmetry(Double value) {
        double raw = value != null ? value : config.getGenome().getFlagellumSteeringAsymmetry().getInitial();
        return clamp(raw, config.getGenome().getFlagellumSteeringAsymmetry());
    }

    private double clamp(double value, YamlConfig.Control control) {
        return ControlScale.roundToStep(value, control);
    }
}
