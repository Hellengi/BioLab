
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

import com.hellengi.biolab.util.ControlScale;

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
                scaled(genome::getDivisionThreshold, genome::setDivisionThreshold, m.getDivisionThreshold(), g.getDivisionThreshold()),
                scaled(genome::getDivisionImpulse, genome::setDivisionImpulse, m.getDivisionImpulse(), g.getDivisionImpulse()),
                wrapped(genome::getDivisionAngle, genome::setDivisionAngle, m.getDivisionAngle(), g.getDivisionAngle()),
                scaled(genome::getCytosolArea, genome::setCytosolArea, m.getCytosolArea(), g.getCytosolArea()),
                scaled(genome::getCytosolDensity, genome::setCytosolDensity, m.getCytosolDensity(), g.getCytosolDensity()),
                scaled(genome::getElasticity, genome::setElasticity, m.getElasticity(), g.getElasticity()),
                scaled(genome::getGfp, genome::setGfp, m.getGfp(), g.getGfp(), genome::isGfpEnabled),
                scaled(genome::getMelaninPercent, genome::setMelaninPercent, m.getMelaninPercent(), g.getMelaninPercent(), genome::isMelaninEnabled),
                roundedScaled(genome::getChloroplastAmount, genome::setChloroplastAmount, m.getChloroplastAmount(), g.getChloroplastAmount(), genome::isChloroplastEnabled),
                scaled(genome::getChlorophyll, genome::setChlorophyll, m.getChlorophyll(), g.getChlorophyll(), genome::isChloroplastEnabled),
                scaled(genome::getCarotenoids, genome::setCarotenoids, m.getCarotenoids(), g.getCarotenoids(), genome::isChloroplastEnabled),
                roundedScaled(genome::getLysosomeAmount, genome::setLysosomeAmount, m.getLysosomeAmount(), g.getLysosomeAmount(), genome::isLysosomeEnabled),
                scaled(genome::getLysosomeEnzymeActivity, genome::setLysosomeEnzymeActivity, m.getLysosomeEnzymeActivity(), g.getLysosomeEnzymeActivity(), genome::isLysosomeEnabled),
                scaled(genome::getFlagellumLength, genome::setFlagellumLength, m.getFlagellumLength(), g.getFlagellumLength(), genome::isFlagellumEnabled),
                scaled(genome::getFlagellumMotorPower, genome::setFlagellumMotorPower, m.getFlagellumMotorPower(), g.getFlagellumMotorPower(), genome::isFlagellumEnabled),
                scaled(genome::getFlagellumPairSpreadAngle, genome::setFlagellumPairSpreadAngle, m.getFlagellumPairSpreadAngle(), g.getFlagellumPairSpreadAngle(), genome::isFlagellumEnabled),
                scaled(genome::getFlagellumSteeringAsymmetry, genome::setFlagellumSteeringAsymmetry, m.getFlagellumSteeringAsymmetry(), g.getFlagellumSteeringAsymmetry(), genome::isFlagellumEnabled)
        ).forEach(spec -> spec.apply(mutationChance));

        toggle(rareChance, genome::isGfpEnabled, genome::setGfpEnabled);
        toggle(rareChance, genome::isMelaninEnabled, genome::setMelaninEnabled);

        toggleOptionalOrganelle(rareChance, genome::isChloroplastEnabled, genome::setChloroplastEnabled, genome::getChloroplastAmount, genome::setChloroplastAmount);
        toggleOptionalOrganelle(rareChance, genome::isLysosomeEnabled, genome::setLysosomeEnabled, genome::getLysosomeAmount, genome::setLysosomeAmount);
        mutateFlagellumMode(rareChance, genome);

        return genome;
    }

    private MutationSpec scaled(
            DoubleSupplier getter,
            DoubleConsumer setter,
            double sigma,
            YamlConfig.Control bounds
    ) {
        return scaled(getter, setter, sigma, bounds, () -> true);
    }

    private MutationSpec scaled(
            DoubleSupplier getter,
            DoubleConsumer setter,
            double sigma,
            YamlConfig.Control bounds,
            BooleanSupplier enabled
    ) {
        return new MutationSpec(enabled, () -> setter.accept(ControlScale.mutateValue(getter.getAsDouble(), sigma, bounds, random)));
    }

    private MutationSpec roundedScaled(
            DoubleSupplier getter,
            DoubleConsumer setter,
            double sigma,
            YamlConfig.Control bounds,
            BooleanSupplier enabled
    ) {
        return new MutationSpec(enabled, () -> setter.accept(Math.round(ControlScale.mutateValue(getter.getAsDouble(), sigma, bounds, random))));
    }

    private MutationSpec wrapped(
            DoubleSupplier getter,
            DoubleConsumer setter,
            double sigma,
            YamlConfig.Control bounds
    ) {
        return wrapped(getter, setter, sigma, bounds, () -> true);
    }

    private MutationSpec wrapped(
            DoubleSupplier getter,
            DoubleConsumer setter,
            double sigma,
            YamlConfig.Control bounds,
            BooleanSupplier enabled
    ) {
        return new MutationSpec(enabled, () -> setter.accept(mutateWrappedGaussian(getter.getAsDouble(), sigma, bounds.getMin(), bounds.getMax())));
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

    private void mutateFlagellumMode(double chance, Genome genome) {
        if (!shouldMutate(chance)) {
            return;
        }
        int current = genome.isFlagellumEnabled() ? Math.max(1, Math.min(2, (int) Math.round(genome.getFlagellumCount()))) : 0;
        int next = current;
        while (next == current) {
            next = random.nextInt(3); // 0 = absent, 1 = single flagellum, 2 = paired flagella.
        }
        genome.setFlagellumEnabled(next > 0);
        if (next > 0) {
            genome.setFlagellumCount(next);
        }
    }

    private boolean shouldMutate(double chance) {
        return random.nextDouble() < chance;
    }

    private double mutateWrappedGaussian(double value, double sigma, double minValue, double maxValue) {
        double mutatedValue = value + random.nextGaussian() * sigma;
        double range = maxValue - minValue + 1.0;
        while (mutatedValue < minValue) mutatedValue += range;
        while (mutatedValue > maxValue) mutatedValue -= range;
        return mutatedValue;
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






