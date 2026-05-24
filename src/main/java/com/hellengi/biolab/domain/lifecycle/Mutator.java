package com.hellengi.biolab.domain.lifecycle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Genome;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
@RequiredArgsConstructor
public class Mutator {
    private static final Logger log = LoggerFactory.getLogger(Mutator.class);

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
}