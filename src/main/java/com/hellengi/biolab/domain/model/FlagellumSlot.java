
package com.hellengi.biolab.domain.model;

import lombok.Getter;
import lombok.Setter;

import static com.hellengi.biolab.util.Utils.clamp01;

@Getter
@Setter
public class FlagellumSlot {
    private int index;
    private double damage;
    private double lastForce;
    private double lastTorque;
    private double lastBaseX;
    private double lastBaseY;
    private double lastDirectionX;
    private double lastDirectionY;
    private double lastEnergyCostRate;
    private double lastDamageRate;
    private double lastRepairRate;
    private double lastRepairEnergyCostRate;

    public FlagellumSlot(int index) {
        this(index, 0.0);
    }

    public FlagellumSlot(int index, double damage) {
        this.index = index;
        this.damage = clamp01(damage);
    }

    public double performance() {
        return DamageModel.performance(damage);
    }

    public boolean active() {
        return damage < 1.0;
    }

    public void damage(double amount) {
        damage = clamp01(damage + Math.max(0.0, amount));
    }

    public void repair(double amount) {
        damage = clamp01(damage - Math.max(0.0, amount));
    }

    public void clearRates() {
        lastForce = 0.0;
        lastTorque = 0.0;
        lastEnergyCostRate = 0.0;
        lastDamageRate = 0.0;
        lastRepairRate = 0.0;
        lastRepairEnergyCostRate = 0.0;
    }

    public void rememberPhysics(double force, double torque, double baseX, double baseY, double dirX, double dirY, double energyCostRate) {
        this.lastForce = Math.max(0.0, force);
        this.lastTorque = torque;
        this.lastBaseX = baseX;
        this.lastBaseY = baseY;
        this.lastDirectionX = dirX;
        this.lastDirectionY = dirY;
        this.lastEnergyCostRate = Math.max(0.0, energyCostRate);
    }

    public void rememberDamageRate(double rate) {
        this.lastDamageRate = Math.max(0.0, rate);
    }

    public void rememberRepairRates(double repairRate, double energyCostRate) {
        this.lastRepairRate = Math.max(0.0, repairRate);
        this.lastRepairEnergyCostRate = Math.max(0.0, energyCostRate);
    }
}


