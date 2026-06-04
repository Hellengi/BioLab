package com.hellengi.biolab.domain.lifecycle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Genome;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;
import java.util.function.BooleanSupplier;
import java.util.function.DoubleConsumer;
import java.util.function.DoubleSupplier;

@Service
@RequiredArgsConstructor
public class Mutator {
    private final YamlConfig config;
    private final RuntimeOverrides runtimeConfig;
    private final Random random = new Random();

    public Genome copyGenomeWithPossibleMutation(Genome parentGenome) {
        Genome genome = parentGenome.copy();
        YamlConfig.GenomeProperties g = config.getGenome();
        YamlConfig.GenomeProperties.MutationDeltas m = g.getMutation();

        double mutationChance = runtimeConfig.getRadiationMutationChance();
        double rareChance = config.getEnvironment().getRareMutationChance() * (1.0 + mutationChance);

        List.of(
                gaussian(genome::getDivisionThreshold, genome::setDivisionThreshold, m.getDivisionThreshold(), g.getDivisionThreshold()),
                logNormal(genome::getDivisionImpulse, genome::setDivisionImpulse, m.getDivisionImpulse(), g.getDivisionImpulse()),
                wrapped(genome::getDivisionAngle, genome::setDivisionAngle, m.getDivisionAngle(), g.getDivisionAngle()),
                logNormal(genome::getMaxEnergy, genome::setMaxEnergy, m.getMaxEnergy(), g.getMaxEnergy()),
                logNormal(genome::getDryMass, genome::setDryMass, m.getDryMass(), g.getDryMass()),
                gaussian(genome::getElasticity, genome::setElasticity, m.getElasticity(), g.getElasticity()),
                gaussian(genome::getGfp, genome::setGfp, m.getGfp(), g.getGfp()),
                gaussian(genome::getMelaninPercent, genome::setMelaninPercent, m.getMelaninPercent(), g.getMelaninPercent(), genome::isMelaninEnabled),
                roundedLogNormal(genome::getChloroplastAmount, genome::setChloroplastAmount, m.getChloroplastAmount(), g.getChloroplastAmount(), genome::isChloroplastEnabled),
                gaussian(genome::getChlorophyll, genome::setChlorophyll, m.getChlorophyll(), g.getChlorophyll(), genome::isChloroplastEnabled),
                gaussian(genome::getCarotenoids, genome::setCarotenoids, m.getCarotenoids(), g.getCarotenoids(), genome::isChloroplastEnabled),
                roundedLogNormal(genome::getLysosomeAmount, genome::setLysosomeAmount, m.getLysosomeAmount(), g.getLysosomeAmount(), genome::isLysosomeEnabled),
                gaussian(genome::getLysosomeEnzymeActivity, genome::setLysosomeEnzymeActivity, m.getLysosomeEnzymeActivity(), g.getLysosomeEnzymeActivity(), genome::isLysosomeEnabled)
        ).forEach(spec -> spec.apply(mutationChance));

        toggle(rareChance, genome::isMelaninEnabled, genome::setMelaninEnabled);
        toggleOptionalOrganelle(rareChance, genome::isChloroplastEnabled, genome::setChloroplastEnabled, genome::getChloroplastAmount, genome::setChloroplastAmount);
        toggleOptionalOrganelle(rareChance, genome::isLysosomeEnabled, genome::setLysosomeEnabled, genome::getLysosomeAmount, genome::setLysosomeAmount);

        return genome;
    }

    private MutationSpec gaussian(
            DoubleSupplier getter,
            DoubleConsumer setter,
            double sigma,
            YamlConfig.Control bounds
    ) {
        return gaussian(getter, setter, sigma, bounds, () -> true);
    }

    private MutationSpec gaussian(
            DoubleSupplier getter,
            DoubleConsumer setter,
            double sigma,
            YamlConfig.Control bounds,
            BooleanSupplier enabled
    ) {
        return new MutationSpec(enabled, () -> setter.accept(mutateGaussian(getter.getAsDouble(), sigma, bounds.getMin(), bounds.getMax())));
    }

    private MutationSpec logNormal(
            DoubleSupplier getter,
            DoubleConsumer setter,
            double sigma,
            YamlConfig.Control bounds
    ) {
        return new MutationSpec(() -> true, () -> setter.accept(mutateLogNormal(getter.getAsDouble(), sigma, bounds.getMin(), bounds.getMax())));
    }

    private MutationSpec roundedLogNormal(
            DoubleSupplier getter,
            DoubleConsumer setter,
            double sigma,
            YamlConfig.Control bounds,
            BooleanSupplier enabled
    ) {
        return new MutationSpec(enabled, () -> setter.accept(Math.round(mutateLogNormal(getter.getAsDouble(), sigma, bounds.getMin(), bounds.getMax()))));
    }

    private MutationSpec wrapped(
            DoubleSupplier getter,
            DoubleConsumer setter,
            double sigma,
            YamlConfig.Control bounds
    ) {
        return new MutationSpec(() -> true, () -> setter.accept(mutateWrappedGaussian(getter.getAsDouble(), sigma, bounds.getMin(), bounds.getMax())));
    }

    private void toggle(double chance, BooleanSupplier getter, java.util.function.Consumer<Boolean> setter) {
        if (shouldMutate(chance)) {
            setter.accept(!getter.getAsBoolean());
        }
    }

    private void toggleOptionalOrganelle(
            double chance,
            BooleanSupplier enabledGetter,
            java.util.function.Consumer<Boolean> enabledSetter,
            DoubleSupplier amountGetter,
            DoubleConsumer amountSetter
    ) {
        if (!shouldMutate(chance)) {
            return;
        }
        boolean nextEnabled = !enabledGetter.getAsBoolean();
        enabledSetter.accept(nextEnabled);
        if (nextEnabled) {
            amountSetter.accept(1.0);
        }
    }

    private boolean shouldMutate(double chance) {
        return random.nextDouble() < chance;
    }

    private double mutateGaussian(double value, double sigma, double minValue, double maxValue) {
        return clamp(value + random.nextGaussian() * sigma, minValue, maxValue);
    }

    private double mutateLogNormal(double value, double sigma, double minValue, double maxValue) {
        double normalizedSigma = Math.max(0.0, sigma) / Math.max(Math.abs(value), 1.0);
        return clamp(value * Math.exp(random.nextGaussian() * normalizedSigma), minValue, maxValue);
    }

    private double mutateWrappedGaussian(double value, double sigma, double minValue, double maxValue) {
        double mutatedValue = value + random.nextGaussian() * sigma;
        double range = maxValue - minValue + 1.0;
        while (mutatedValue < minValue) mutatedValue += range;
        while (mutatedValue > maxValue) mutatedValue -= range;
        return mutatedValue;
    }

    private double clamp(double value, double minValue, double maxValue) {
        return Math.max(minValue, Math.min(maxValue, value));
    }

    private final class MutationSpec {
        private final BooleanSupplier enabled;
        private final Runnable mutation;

        private MutationSpec(BooleanSupplier enabled, Runnable mutation) {
            this.enabled = enabled;
            this.mutation = mutation;
        }

        void apply(double chance) {
            if (enabled.getAsBoolean() && shouldMutate(chance)) {
                mutation.run();
            }
        }
    }
}

