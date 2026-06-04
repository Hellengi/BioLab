package com.hellengi.biolab.domain.model;

import lombok.Getter;
import lombok.Setter;

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
        return Math.exp(-Math.max(0.0, damage));
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

    public LysosomeSlot copyWithoutFood(int newIndex) {
        LysosomeSlot copy = new LysosomeSlot(newIndex, null, damage);
        copy.setLayoutX(layoutX);
        copy.setLayoutY(layoutY);
        copy.setLayoutRadius(layoutRadius);
        copy.setLayoutRotation(layoutRotation);
        copy.setTargetLayout(targetLayoutX, targetLayoutY, targetLayoutRadius, targetLayoutRotation);
        return copy;
    }

    public void setLayout(double x, double y, double radius, double rotation) {
        this.layoutX = finite(x);
        this.layoutY = finite(y);
        this.layoutRadius = Math.max(0.0, finite(radius));
        this.layoutRotation = finite(rotation);
    }

    public void setTargetLayout(double x, double y, double radius, double rotation) {
        this.targetLayoutX = finite(x);
        this.targetLayoutY = finite(y);
        this.targetLayoutRadius = Math.max(0.0, finite(radius));
        this.targetLayoutRotation = finite(rotation);
    }

    public void addDamage(double value) {
        this.damage = clamp01(this.damage + Math.max(0.0, value));
    }

    public void repair(double value) {
        this.damage = clamp01(this.damage - Math.max(0.0, value));
    }

    public void rememberDigestionRates(double energyProductionRate, double energyCostRate, double damageRate) {
        this.lastEnergyProductionRate = Math.max(0.0, finite(energyProductionRate));
        addEnergyCostRate(energyCostRate);
        this.lastDamageRate = Math.max(0.0, finite(damageRate));
    }

    public void addEnergyCostRate(double energyCostRate) {
        this.lastEnergyCostRate = Math.max(0.0, this.lastEnergyCostRate + Math.max(0.0, finite(energyCostRate)));
    }

    public void rememberRepairRates(double repairRate, double repairEnergyCostRate) {
        this.lastRepairRate = Math.max(0.0, finite(repairRate));
        this.lastRepairEnergyCostRate = Math.max(0.0, finite(repairEnergyCostRate));
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

    private double finite(double value) {
        return Double.isFinite(value) ? value : 0.0;
    }

    private double clamp01(double value) {
        if (!Double.isFinite(value)) return 0.0;
        return Math.max(0.0, Math.min(1.0, value));
    }
}
