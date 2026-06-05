package com.hellengi.biolab.dto.mapper;

import com.hellengi.biolab.config.YamlConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GenomeDefaults {
    private final YamlConfig config;

    public double dryMass(Double value) {
        return value != null ? value : config.getGenome().getDryMass().getInitial();
    }

    public double elasticity(Double value) {
        return value != null ? value : config.getGenome().getElasticity().getInitial();
    }

    public double gfp(Double value) {
        return value != null ? value : config.getGenome().getGfp().getInitial();
    }

    public double melaninPercent(Double value) {
        return value != null ? value : config.getGenome().getMelaninPercent().getInitial();
    }

    public double chloroplastAmount(Double value) {
        return value != null ? value : config.getGenome().getChloroplastAmount().getInitial();
    }

    public double chlorophyll(Double value) {
        double raw = value != null ? value : config.getGenome().getChlorophyll().getInitial();
        return Math.max(config.getGenome().getChlorophyll().getMin(), raw);
    }

    public double carotenoids(Double value) {
        return value != null ? value : config.getGenome().getCarotenoids().getInitial();
    }

    public double lysosomeAmount(Double value) {
        double raw = value != null ? value : config.getGenome().getLysosomeAmount().getInitial();
        return clamp(raw, config.getGenome().getLysosomeAmount());
    }

    public double lysosomeEnzymeActivity(Double value) {
        double raw = value != null ? value : config.getGenome().getLysosomeEnzymeActivity().getInitial();
        return clamp(raw, config.getGenome().getLysosomeEnzymeActivity());
    }

    private double clamp(double value, YamlConfig.Control control) {
        return Math.max(control.getMin(), Math.min(control.getMax(), value));
    }
}
