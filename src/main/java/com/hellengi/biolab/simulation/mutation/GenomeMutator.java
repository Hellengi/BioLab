package com.hellengi.biolab.simulation.mutation;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.util.GenomeCodec;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

@Component
@RequiredArgsConstructor
public class GenomeMutator {
    private static final Logger log = LoggerFactory.getLogger(GenomeMutator.class);

    private final YamlConfig config;
    private final Random random = new Random();

    public Genome copyGenomeWithPossibleMutation(Genome parentGenome) {
        Genome oldGenome = parentGenome.copy();
        Genome genome = parentGenome.copy();

        double mutationChance = config.getGenome().getRadiationChance();
        boolean mutated = false;

        mutated |= mutateDivisionThreshold(genome, mutationChance);
        mutated |= mutateDivisionImpulse(genome, mutationChance);
        mutated |= mutateMaxEnergy(genome, mutationChance);

        if (!mutated) return genome;

        mutateColorHue(genome, 1.0);
        mutateSaturation(genome, 1.0);
        mutateLightness(genome, 1.0);

        logGenomeMutation(oldGenome, genome);
        return genome;
    }

    private boolean shouldMutate(double chance) {
        return random.nextDouble() < chance;
    }

    private boolean mutateDivisionThreshold(Genome genome, double chance) {
        if (!shouldMutate(chance)) return false;

        genome.setDivisionThreshold(
                mutateValue(
                        genome.getDivisionThreshold(),
                            config.getGenome().getMutation().getDivisionThreshold(),
                        config.getGenome().getLimits().getDivisionThreshold().getMin(),
                        config.getGenome().getLimits().getDivisionThreshold().getMax()
                )
        );

        return true;
    }

    private boolean mutateDivisionImpulse(Genome genome, double chance) {
        if (!shouldMutate(chance)) return false;

        genome.setDivisionImpulseStrength(
                mutateValue(
                        genome.getDivisionImpulseStrength(),
                        config.getGenome().getMutation().getDivisionImpulse(),
                        config.getGenome().getLimits().getDivisionImpulse().getMin(),
                        config.getGenome().getLimits().getDivisionImpulse().getMax()
                )
        );

        return true;
    }

    private boolean mutateMaxEnergy(Genome genome, double chance) {
        if (!shouldMutate(chance)) return false;

        genome.setMaxEnergy(
                mutateValue(
                        genome.getMaxEnergy(),
                        config.getGenome().getMutation().getMaxEnergy(),
                        config.getGenome().getLimits().getMaxEnergy().getMin(),
                        config.getGenome().getLimits().getMaxEnergy().getMax()
                )
        );

        return true;
    }


    private boolean mutateColorHue(Genome genome, double chance) {
        if (!shouldMutate(chance)) return false;

        genome.setColorHue(
                mutateHue(
                        genome.getColorHue(),
                        config.getGenome().getMutation().getColorHue()
                )
        );

        return true;
    }

    private boolean mutateSaturation(Genome genome, double chance) {
        if (!shouldMutate(chance)) return false;

        genome.setSaturation(
                mutateValue(
                        genome.getSaturation(),
                        config.getGenome().getMutation().getSaturation(),
                        config.getGenome().getLimits().getSaturation().getMin(),
                        config.getGenome().getLimits().getSaturation().getMax()
                )
        );

        return true;
    }

    private boolean mutateLightness(Genome genome, double chance) {
        if (!shouldMutate(chance)) return false;

        genome.setLightness(
                mutateValue(
                        genome.getLightness(),
                        config.getGenome().getMutation().getLightness(),
                        config.getGenome().getLimits().getLightness().getMin(),
                        config.getGenome().getLimits().getLightness().getMax()
                )
        );

        return true;
    }

    private double mutateValue(double value, double mutationDelta, double minValue, double maxValue) {
        double mutatedValue = value + (random.nextDouble() * 2.0 - 1.0) * mutationDelta;
        return Math.max(minValue, Math.min(maxValue, mutatedValue));
    }

    private double mutateHue(double hue, double delta) {
        double mutatedHue = hue + (random.nextDouble() * 2.0 - 1.0) * delta;
        double min = config.getGenome().getLimits().getColorHue().getMin();
        double max = config.getGenome().getLimits().getColorHue().getMax();

        while (mutatedHue < min) {
            mutatedHue += 360.0;
        }

        while (mutatedHue > max) {
            mutatedHue -= 360.0;
        }

        return mutatedHue;
    }

    private void logGenomeMutation(Genome oldGenome, Genome newGenome) {
        String oldCode = GenomeCodec.encode(oldGenome);
        String newCode = GenomeCodec.encode(newGenome);

        List<String> changes = new ArrayList<>();
        addGenomeChange(changes, "divisionThreshold", oldGenome.getDivisionThreshold(), newGenome.getDivisionThreshold());
        addGenomeChange(changes, "divisionImpulseStrength", oldGenome.getDivisionImpulseStrength(), newGenome.getDivisionImpulseStrength());
        addGenomeChange(changes, "colorHue", oldGenome.getColorHue(), newGenome.getColorHue());
        addGenomeChange(changes, "saturation", oldGenome.getSaturation(), newGenome.getSaturation());
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