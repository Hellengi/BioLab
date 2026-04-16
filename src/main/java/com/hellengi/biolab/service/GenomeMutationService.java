package com.hellengi.biolab.service;

import com.hellengi.biolab.config.SimulationProperties;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.util.GenomeCodeCodec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

@Component
public class GenomeMutationService {

    private static final Logger log = LoggerFactory.getLogger(GenomeMutationService.class);

    private final SimulationProperties config;
    private final Random random = new Random();

    public GenomeMutationService(SimulationProperties config) {
        this.config = config;
    }

    public Genome copyGenomeWithPossibleMutation(Genome parentGenome) {
        Genome oldGenome = parentGenome.copy();
        Genome genome = parentGenome.copy();

        if (random.nextDouble() >= config.getGenome().getRadiationMutationChance()) {
            return genome;
        }

        int mutationTarget = random.nextInt(3);

        switch (mutationTarget) {
            case 0 -> genome.setDivisionThreshold(
                    mutateValue(
                            genome.getDivisionThreshold(),
                            config.getGenome().getDivisionThresholdMutationDelta(),
                            config.getGenome().getDivisionThresholdMin(),
                            config.getGenome().getDivisionThresholdMax()
                    )
            );
            case 1 -> genome.setDivisionImpulseStrength(
                    mutateValue(
                            genome.getDivisionImpulseStrength(),
                            config.getGenome().getDivisionImpulseMutationDelta(),
                            config.getGenome().getDivisionImpulseMin(),
                            config.getGenome().getDivisionImpulseMax()
                    )
            );
            case 2 -> genome.setMaxEnergy(
                    mutateValue(
                            genome.getMaxEnergy(),
                            config.getGenome().getMaxEnergyMutationDelta(),
                            config.getGenome().getMaxEnergyMin(),
                            config.getGenome().getMaxEnergyMax()
                    )
            );
            default -> {
            }
        }

        genome.setColorHue(
                mutateHue(
                        genome.getColorHue(),
                        config.getGenome().getColorHueMutationDelta()
                )
        );

        genome.setLightness(
                mutateValue(
                        genome.getLightness(),
                        config.getGenome().getLightnessMutationDelta(),
                        config.getGenome().getLightnessMin(),
                        config.getGenome().getLightnessMax()
                )
        );

        logGenomeMutation(oldGenome, genome);
        return genome;
    }

    private double mutateValue(double value, double mutationDelta, double minValue, double maxValue) {
        double mutatedValue = value + (random.nextDouble() * 2.0 - 1.0) * mutationDelta;
        return Math.max(minValue, Math.min(maxValue, mutatedValue));
    }

    private double mutateHue(double hue, double delta) {
        double mutatedHue = hue + (random.nextDouble() * 2.0 - 1.0) * delta;

        while (mutatedHue < config.getGenome().getColorHueMin()) {
            mutatedHue += 360.0;
        }

        while (mutatedHue > config.getGenome().getColorHueMax()) {
            mutatedHue -= 360.0;
        }

        return mutatedHue;
    }

    private void logGenomeMutation(Genome oldGenome, Genome newGenome) {
        String oldCode = GenomeCodeCodec.encode(oldGenome);
        String newCode = GenomeCodeCodec.encode(newGenome);

        List<String> changes = new ArrayList<>();
        addGenomeChange(changes, "divisionThreshold", oldGenome.getDivisionThreshold(), newGenome.getDivisionThreshold());
        addGenomeChange(changes, "divisionImpulseStrength", oldGenome.getDivisionImpulseStrength(), newGenome.getDivisionImpulseStrength());
        addGenomeChange(changes, "colorHue", oldGenome.getColorHue(), newGenome.getColorHue());
        addGenomeChange(changes, "lightness", oldGenome.getLightness(), newGenome.getLightness());
        addGenomeChange(changes, "maxEnergy", oldGenome.getMaxEnergy(), newGenome.getMaxEnergy());

        log.info("Mutation: {} -> {} | {}", oldCode, newCode, String.join("; ", changes));
    }

    private void addGenomeChange(List<String> changes, String name, double oldValue, double newValue) {
        if (Double.compare(oldValue, newValue) != 0) {
            changes.add(name + ": " + formatDouble(oldValue) + " -> " + formatDouble(newValue));
        }
    }

    private String formatDouble(double value) {
        return String.format(Locale.US, "%.2f", value);
    }
}