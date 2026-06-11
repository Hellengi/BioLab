package com.hellengi.biolab.dto.database_mapper;

import com.hellengi.biolab.database.entity.common.DamageFlowEntity;
import com.hellengi.biolab.database.entity.common.EnergyFlowEntity;
import com.hellengi.biolab.database.entity.common.LayoutStateEntity;
import com.hellengi.biolab.database.entity.common.PhysicalStateEntity;

final class SnapshotEntityStateFactory {
    private SnapshotEntityStateFactory() {
    }

    static PhysicalStateEntity physical(
            double x,
            double y,
            double vx,
            double vy,
            double angularVelocity,
            double radius,
            double mass,
            double density,
            Double opacity,
            double directionAngle
    ) {
        PhysicalStateEntity state = new PhysicalStateEntity();
        state.setX(x);
        state.setY(y);
        state.setVx(vx);
        state.setVy(vy);
        state.setAngularVelocity(angularVelocity);
        state.setRadius(radius);
        state.setMass(mass);
        state.setDensity(density);
        state.setOpacity(opacity);
        state.setDirectionAngle(directionAngle);
        return state;
    }

    static EnergyFlowEntity energy(
            double energy,
            double production,
            double consumption,
            double digestionProduction,
            double digestionCost,
            double repairCost,
            double divisionCost
    ) {
        EnergyFlowEntity state = new EnergyFlowEntity();
        state.setEnergy(energy);
        state.setProductionRate(production);
        state.setConsumptionRate(consumption);
        state.setDigestionProductionRate(digestionProduction);
        state.setDigestionCostRate(digestionCost);
        state.setRepairCostRate(repairCost);
        state.setDivisionCost(divisionCost);
        return state;
    }

    static DamageFlowEntity damage(double damage, double damageRate, double repairRate, double repairEnergyCostRate) {
        DamageFlowEntity state = new DamageFlowEntity();
        state.setDamage(damage);
        state.setDamageRate(damageRate);
        state.setRepairRate(repairRate);
        state.setRepairEnergyCostRate(repairEnergyCostRate);
        return state;
    }

    static LayoutStateEntity layout(
            double x,
            double y,
            double radius,
            double rotation,
            double targetX,
            double targetY,
            double targetRadius,
            double targetRotation
    ) {
        LayoutStateEntity state = new LayoutStateEntity();
        state.setX(x);
        state.setY(y);
        state.setRadius(radius);
        state.setRotation(rotation);
        state.setTargetX(targetX);
        state.setTargetY(targetY);
        state.setTargetRadius(targetRadius);
        state.setTargetRotation(targetRotation);
        return state;
    }
}
