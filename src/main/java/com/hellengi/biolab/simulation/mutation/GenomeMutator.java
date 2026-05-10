package com.hellengi.biolab.simulation.mutation;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.model.Genome;
import com.hellengi.biolab.simulation.settings.RuntimeOverrides;
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
    private final RuntimeOverrides runtimeConfig;
    private final Random random = new Random();

    public Genome copyGenomeWithPossibleMutation(Genome parentGenome) {
        Genome oldGenome = parentGenome.copy();
        Genome genome = parentGenome.copy();

        double mutationChance = runtimeConfig.getRadiationMutationChance();
        boolean mutated = false;

        mutated |= mutateDivisionThreshold(genome, mutationChance);
        mutated |= mutateDivisionImpulse(genome, mutationChance);
        mutated |= mutateDivisionAngle(genome, mutationChance);
        mutated |= mutateMaxEnergy(genome, mutationChance);
        mutated |= mutateDryMass(genome, mutationChance);
        mutated |= mutateElasticity(genome, mutationChance);

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
                        config.getGenome().getDivisionThreshold().getMin(),
                        config.getGenome().getDivisionThreshold().getMax()
                )
        );

        return true;
    }

    private boolean mutateDivisionImpulse(Genome genome, double chance) {
        if (!shouldMutate(chance)) return false;

        genome.setDivisionImpulse(
                mutateValue(
                        genome.getDivisionImpulse(),
                        config.getGenome().getMutation().getDivisionImpulse(),
                        config.getGenome().getDivisionImpulse().getMin(),
                        config.getGenome().getDivisionImpulse().getMax()
                )
        );

        return true;
    }

    private boolean mutateDivisionAngle(Genome genome, double chance) {
        if (!shouldMutate(chance)) return false;

        genome.setDivisionAngle(
                mutateWrappedValue(
                        genome.getDivisionAngle(),
                        config.getGenome().getMutation().getDivisionAngle(),
                        config.getGenome().getDivisionAngle().getMin(),
                        config.getGenome().getDivisionAngle().getMax()
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
                        config.getGenome().getMaxEnergy().getMin(),
                        config.getGenome().getMaxEnergy().getMax()
                )
        );

        return true;
    }

    private boolean mutateDryMass(Genome genome, double chance) {
        if (!shouldMutate(chance)) return false;

        genome.setDryMass(
                mutateValue(
                        genome.getDryMass(),
                        config.getGenome().getMutation().getDryMass(),
                        config.getGenome().getDryMass().getMin(),
                        config.getGenome().getDryMass().getMax()
                )
        );

        return true;
    }

    private boolean mutateElasticity(Genome genome, double chance) {
        if (!shouldMutate(chance)) return false;

        genome.setElasticity(
                mutateValue(
                        genome.getElasticity(),
                        config.getGenome().getMutation().getElasticity(),
                        config.getGenome().getElasticity().getMin(),
                        config.getGenome().getElasticity().getMax()
                )
        );

        return true;
    }

    private boolean mutateColorHue(Genome genome, double chance) {
        if (!shouldMutate(chance)) return false;

        genome.setColorHue(
                mutateWrappedValue(
                        genome.getColorHue(),
                        config.getGenome().getMutation().getColorHue(),
                        config.getGenome().getColorHue().getMin(),
                        config.getGenome().getColorHue().getMax()
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
                        config.getGenome().getSaturation().getMin(),
                        config.getGenome().getSaturation().getMax()
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
                        config.getGenome().getLightness().getMin(),
                        config.getGenome().getLightness().getMax()
                )
        );

        return true;
    }

    private double mutateValue(double value, double mutationDelta, double minValue, double maxValue) {
        double mutatedValue = value + (random.nextDouble() * 2.0 - 1.0) * mutationDelta;
        return Math.max(minValue, Math.min(maxValue, mutatedValue));
    }

    private double mutateWrappedValue(double value, double mutationDelta, double minValue, double maxValue) {
        double mutatedValue = value + (random.nextDouble() * 2.0 - 1.0) * mutationDelta;
        double range = maxValue - minValue + 1.0;

        while (mutatedValue < minValue) {
            mutatedValue += range;
        }

        while (mutatedValue > maxValue) {
            mutatedValue -= range;
        }

        return mutatedValue;
    }

    private void logGenomeMutation(Genome oldGenome, Genome newGenome) {
        String oldCode = GenomeCodec.encode(oldGenome);
        String newCode = GenomeCodec.encode(newGenome);

        List<String> changes = new ArrayList<>();
        addGenomeChange(changes, "divisionThreshold", oldGenome.getDivisionThreshold(), newGenome.getDivisionThreshold());
        addGenomeChange(changes, "divisionImpulse", oldGenome.getDivisionImpulse(), newGenome.getDivisionImpulse());
        addGenomeChange(changes, "divisionAngle", oldGenome.getDivisionAngle(), newGenome.getDivisionAngle());
        addGenomeChange(changes, "colorHue", oldGenome.getColorHue(), newGenome.getColorHue());
        addGenomeChange(changes, "saturation", oldGenome.getSaturation(), newGenome.getSaturation());
        addGenomeChange(changes, "lightness", oldGenome.getLightness(), newGenome.getLightness());
        addGenomeChange(changes, "maxEnergy", oldGenome.getMaxEnergy(), newGenome.getMaxEnergy());
        addGenomeChange(changes, "dryMass", oldGenome.getDryMass(), newGenome.getDryMass());
        addGenomeChange(changes, "elasticity", oldGenome.getElasticity(), newGenome.getElasticity());

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