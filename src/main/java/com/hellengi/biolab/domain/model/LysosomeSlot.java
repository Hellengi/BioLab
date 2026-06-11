package com.hellengi.biolab.domain.model;

import lombok.Getter;
import lombok.Setter;
import static com.hellengi.biolab.util.Utils.clamp01;
import static com.hellengi.biolab.util.Utils.finiteOrZero;

@Getter
@Setter
public class LysosomeSlot {
    private int index;
    private Long foodId;
    private double damage;
    private double foodEnergy;
    private double foodRadius;
    private boolean foodInsideLysosome;
    private double layoutX;
    private double layoutY;
    private double layoutRadius;
    private double layoutRotation;
    private double targetLayoutX;
    private double targetLayoutY;
    private double targetLayoutRadius;
    private double targetLayoutRotation;
    private double targetFoodRadius;
    private double lastEnergyProductionRate;
    private double lastEnergyCostRate;
    private double lastDamageRate;
    private double lastRepairRate;
    private double lastRepairEnergyCostRate;

    public LysosomeSlot(int index) {
        this.index = index;
    }

    public LysosomeSlot(int index, Long foodId, double damage) {
        this.index = index;
        this.foodId = foodId;
        this.damage = clamp01(damage);
    }

    public boolean isOccupied() {
        return foodId != null;
    }

    public boolean hasLayout() {
        return layoutRadius > 0.0 && Double.isFinite(layoutX) && Double.isFinite(layoutY);
    }

    public boolean hasTargetLayout() {
        return targetLayoutRadius > 0.0 && Double.isFinite(targetLayoutX) && Double.isFinite(targetLayoutY);
    }

    public double performance() {
        return DamageModel.performance(damage);
    }

    public void occupy(long foodId) {
        this.foodId = foodId;
        this.foodInsideLysosome = false;
        resetFoodSnapshot();
        clearRates();
    }

    public void clearFood() {
        this.foodId = null;
        this.foodInsideLysosome = false;
        targetFoodRadius = 0.0;
        resetFoodSnapshot();
        clearDigestionRates();
    }

    public void syncFood(Food food) {
        if (food == null || foodId == null || food.getId() != foodId) {
            resetFoodSnapshot();
            foodInsideLysosome = false;
            return;
        }
        foodEnergy = Math.max(0.0, food.getEnergy());
        foodRadius = Math.max(0.0, food.getRadius());
        targetFoodRadius = foodRadius;
        foodInsideLysosome = food.isInsideLysosome();
    }


    public void setLayout(double x, double y, double radius, double rotation) {
        this.layoutX = finiteOrZero(x);
        this.layoutY = finiteOrZero(y);
        this.layoutRadius = Math.max(0.0, finiteOrZero(radius));
        this.layoutRotation = finiteOrZero(rotation);
    }

    public void setTargetLayout(double x, double y, double radius, double rotation) {
        this.targetLayoutX = finiteOrZero(x);
        this.targetLayoutY = finiteOrZero(y);
        this.targetLayoutRadius = Math.max(0.0, finiteOrZero(radius));
        this.targetLayoutRotation = finiteOrZero(rotation);
    }

    public void addDamage(double value) {
        this.damage = clamp01(this.damage + Math.max(0.0, value));
    }

    public void repair(double value) {
        this.damage = clamp01(this.damage - Math.max(0.0, value));
    }

    public void rememberDigestionRates(double energyProductionRate, double energyCostRate, double damageRate) {
        this.lastEnergyProductionRate = Math.max(0.0, finiteOrZero(energyProductionRate));
        addEnergyCostRate(energyCostRate);
        this.lastDamageRate = Math.max(0.0, finiteOrZero(damageRate));
    }

    public void addEnergyCostRate(double energyCostRate) {
        this.lastEnergyCostRate = Math.max(0.0, this.lastEnergyCostRate + Math.max(0.0, finiteOrZero(energyCostRate)));
    }

    public void rememberRepairRates(double repairRate, double repairEnergyCostRate) {
        this.lastRepairRate = Math.max(0.0, finiteOrZero(repairRate));
        this.lastRepairEnergyCostRate = Math.max(0.0, finiteOrZero(repairEnergyCostRate));
    }

    public void clearRates() {
        clearDigestionRates();
        lastRepairRate = 0.0;
        lastRepairEnergyCostRate = 0.0;
    }

    public void clearDigestionRates() {
        lastEnergyProductionRate = 0.0;
        lastEnergyCostRate = 0.0;
        lastDamageRate = 0.0;
    }

    private void resetFoodSnapshot() {
        foodEnergy = 0.0;
        foodRadius = 0.0;
    }

}
