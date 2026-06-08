package com.hellengi.biolab.domain.lifecycle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.DamageModel;
import com.hellengi.biolab.domain.model.Genome;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LifecycleDivider {
    private final YamlConfig config;
    private final Mutator mutator;

    public List<Cell> divide(Cell parent) {
        Genome firstGenome = mutator.copyGenomeWithPossibleMutation(parent.getGenome());
        Genome secondGenome = mutator.copyGenomeWithPossibleMutation(parent.getGenome());

        double firstDivisionImpulse = firstGenome.getDivisionImpulse();
        double secondDivisionImpulse = secondGenome.getDivisionImpulse();

        double divCost = parent.getDivisionEnergyCost();
        double baseChildEnergy = Math.max(0.0, parent.getEnergy() / 2.0 - divCost);

        double firstEnergy = Math.min(baseChildEnergy, firstGenome.getMaxEnergy());
        double secondEnergy = Math.min(baseChildEnergy, secondGenome.getMaxEnergy());

        double divisionAxisAngle = Math.toRadians(parent.getDirectionAngle())
                + Math.toRadians(parent.getGenome().getDivisionAngle());

        double directionX = Math.cos(divisionAxisAngle);
        double directionY = Math.sin(divisionAxisAngle);

        double firstVx = parent.getVx() + directionX * firstDivisionImpulse;
        double firstVy = parent.getVy() + directionY * firstDivisionImpulse;

        double secondVx = parent.getVx() - directionX * secondDivisionImpulse;
        double secondVy = parent.getVy() - directionY * secondDivisionImpulse;

        Cell first = createChild(parent, firstGenome, firstEnergy, firstVx, firstVy);
        Cell second = createChild(parent, secondGenome, secondEnergy, secondVx, secondVy);

        double distanceBetweenCenters = first.getRadius() + second.getRadius();
        double offsetFromParent = distanceBetweenCenters / 2.0;

        double firstX = parent.getX() + directionX * offsetFromParent;
        double firstY = parent.getY() + directionY * offsetFromParent;

        double secondX = parent.getX() - directionX * offsetFromParent;
        double secondY = parent.getY() - directionY * offsetFromParent;

        first.setPosition(firstX, firstY);
        second.setPosition(secondX, secondY);

        return List.of(first, second);
    }

    private Cell createChild(Cell parent, Genome genome, double energy, double vx, double vy) {
        Cell child = new Cell(config);
        child.setVelocity(vx, vy);
        child.setAngularVelocity(parent.getAngularVelocity());
        child.setEnergy(energy);
        child.setGenome(genome);
        child.setDirectionAngle(parent.getDirectionAngle());
        transferDamage(parent, child);
        return child;
    }

    private void transferDamage(Cell parent, Cell child) {
        transferScalarDamage(parent, child);
        transferSlotDamage(parent, child);
    }

    private void transferScalarDamage(Cell parent, Cell child) {
        for (Cell.ScalarDamageChannel parentChannel : parent.scalarDamageChannels()) {
            Cell.ScalarDamageChannel childChannel = child.scalarDamageChannels().stream()
                    .filter(channel -> channel.id().equals(parentChannel.id()))
                    .findFirst()
                    .orElse(null);
            if (childChannel == null) continue;
            childChannel.setter().accept(DamageModel.inheritedDamage(parentChannel.getter().getAsDouble(), config.getCell()));
        }
    }

    private void transferSlotDamage(Cell parent, Cell child) {
        for (Cell.SlotDamageChannel<?> parentChannel : parent.slotDamageChannels()) {
            Cell.SlotDamageChannel<?> childChannel = child.slotDamageChannels().stream()
                    .filter(channel -> channel.id().equals(parentChannel.id()))
                    .findFirst()
                    .orElse(null);
            if (childChannel == null) continue;
            transferSlotDamageUnchecked(parentChannel, childChannel);
        }
    }

    @SuppressWarnings("unchecked")
    private <T> void transferSlotDamageUnchecked(Cell.SlotDamageChannel<?> parentRaw, Cell.SlotDamageChannel<?> childRaw) {
        Cell.SlotDamageChannel<T> parent = (Cell.SlotDamageChannel<T>) parentRaw;
        Cell.SlotDamageChannel<T> child = (Cell.SlotDamageChannel<T>) childRaw;
        double fallbackSourceDamage = parent.averageDamage().getAsDouble();
        for (T childSlot : child.slots()) {
            T parentSlot = parent.slotByIndex().apply(child.indexGetter().applyAsInt(childSlot));
            double sourceDamage = parentSlot != null ? parent.damageGetter().applyAsDouble(parentSlot) : fallbackSourceDamage;
            child.damageSetter().accept(childSlot, DamageModel.inheritedDamage(sourceDamage, config.getCell()));
        }
    }
}
