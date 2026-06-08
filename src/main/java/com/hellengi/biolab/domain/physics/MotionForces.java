

package com.hellengi.biolab.domain.physics;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.FlagellumSlot;
import com.hellengi.biolab.domain.settings.RuntimeOverrides;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import static com.hellengi.biolab.util.Utils.*;

@Component
@RequiredArgsConstructor
public class MotionForces {
    private static final double TWO_DIMENSIONAL_ROTATIONAL_DRAG_FACTOR = 4.0 * Math.PI;
    private static final double STOKES_TRANSLATIONAL_DRAG_FACTOR = 6.0 * Math.PI;

    private final YamlConfig baseConfig;
    private final RuntimeOverrides runtimeConfig;

    public void applyFlagella(Cell cell, double tickScale) {
        cell.resetFlagellumSlotRates();
        if (!cell.isAlive() || !cell.hasFlagella() || tickScale <= 0.0) {
            cell.setAngularVelocity(cell.getAngularVelocity() * Math.exp(-calculateRotationalDamping(cell) * Math.max(0.0, tickScale)));
            return;
        }

        double radius = cell.getRadius();
        double translationalDrag = calculateTranslationalDragCoefficient(radius);
        double rotationalDrag = calculateRotationalDragCoefficient(cell);
        double forceX = 0.0;
        double forceY = 0.0;
        double totalTorque = 0.0;

        double energyFactor = calculateFlagellaEnergyFactor(cell);

        for (FlagellumSlot slot : cell.getFlagellumSlots()) {
            int index = slot.getIndex();
            double motor = cell.flagellumMotorPower01(index);
            double health = slot.performance();
            double activity = motor * health * energyFactor;
            double lengthFactor = Math.max(0.05, cell.getFlagellumLength(index) / Math.max(radius, EPSILON));
            double thrust = baseConfig.getCell().getFlagellumBaseThrustFactor()
                    * radius * radius
                    * activity
                    * lengthFactor;

            double dirX = cell.getFlagellumDirectionX(index);
            double dirY = cell.getFlagellumDirectionY(index);
            double localBaseX = cell.getFlagellumBaseLocalX(index);
            double localBaseY = cell.getFlagellumBaseLocalY(index);
            double fx = thrust * dirX;
            double fy = thrust * dirY;
            double torque = localBaseX * fy - localBaseY * fx;

            double inducedSpeed = Math.abs(thrust) / avoidZero(translationalDrag);
            double hydrodynamicPower = Math.abs(thrust) * inducedSpeed;
            double energyCostRate = baseConfig.getCell().getFlagellumEnergyCostFactor()
                    * hydrodynamicPower;
            slot.rememberPhysics(thrust, torque, localBaseX, localBaseY, dirX, dirY, energyCostRate);
            cell.addFlagellumEnergyCostRate(energyCostRate);

            forceX += fx;
            forceY += fy;
            totalTorque += torque;
        }

        // Low-Reynolds-number approximation: velocity is driven by force/drag instead
        // of accumulating a large inertial acceleration. Current velocity is still
        // retained so gravity/collisions keep their existing behavior.
        double targetVx = forceX / avoidZero(translationalDrag);
        double targetVy = forceY / avoidZero(translationalDrag);
        cell.setVx(cell.getVx() + targetVx * tickScale);
        cell.setVy(cell.getVy() + targetVy * tickScale);
        cell.setAngularVelocity(totalTorque / avoidZero(rotationalDrag));
    }


    private double calculateFlagellaEnergyFactor(Cell cell) {
        // Shared supply path: every organelle receives the same fraction of its
        // basal demand when energy is scarce. Flagella use the last measured
        // supply fraction so both movement force and visual beating fade with
        // functional performance instead of abruptly stopping at zero reserve.
        return clamp01(cell.getLastEnergyAvailability());
    }

    public void applyViscosity(Cell cell, double tickScale) {
        double radius = cell.getRadius();
        double mass = cell.getMass();
        double viscosity = runtimeConfig.getViscosity();
        if (viscosity <= 0.0) return;

        double drag = calculateTranslationalDragCoefficient(radius) / avoidZero(mass);
        double damping = Math.exp(-drag * tickScale);

        cell.setVx(cell.getVx() * damping);
        cell.setVy(cell.getVy() * damping);

        double rotationalDamping = Math.exp(-calculateRotationalDamping(cell) * tickScale);
        cell.setAngularVelocity(cell.getAngularVelocity() * rotationalDamping);
    }

    public void applyGravity(Cell cell, double tickScale) {
        double mass = cell.getMass();
        double acceleration = calculateGravForce(cell) / avoidZero(mass);
        cell.setVy(cell.getVy() + acceleration * tickScale);
    }

    public double calculateDragForce(double vx, double vy, double radius) {
        double speed = Math.sqrt(vx * vx + vy * vy);
        return calculateTranslationalDragCoefficient(radius) * speed;
    }

    public double calculateTranslationalDragCoefficient(double radius) {
        double viscosity = runtimeConfig.getViscosity();
        return STOKES_TRANSLATIONAL_DRAG_FACTOR * Math.max(0.0, viscosity) * Math.max(radius, EPSILON);
    }

    public double calculateRotationalDragCoefficient(Cell cell) {
        return calculateRotationalDragCoefficient(cell.getRadius());
    }

    public double calculateRotationalDragCoefficient(double radius) {
        double viscosity = runtimeConfig.getViscosity();
        // 2D circular-cell model: a round planar cell is approximated as a
        // unit-depth rotating disk/cylinder section, so τ_drag = -4πηR²ω.
        // η is the surrounding medium viscosity, R is cell radius, and ω is
        // angular velocity. Membrane elasticity is intentionally not used here:
        // in this project it represents collision restitution, not viscous drag.
        return TWO_DIMENSIONAL_ROTATIONAL_DRAG_FACTOR
                * Math.max(0.0, viscosity)
                * Math.max(radius * radius, EPSILON);
    }

    public double calculateRotationalDragTorque(Cell cell) {
        return calculateRotationalDragCoefficient(cell) * Math.abs(cell.getAngularVelocity());
    }

    private double calculateRotationalDamping(Cell cell) {
        double inertia = Math.max(cell.getMass() * cell.getRadius() * cell.getRadius() * 0.5, EPSILON);
        return calculateRotationalDragCoefficient(cell) / inertia;
    }

    public double calculateGravForce(Cell cell) {
        double gravity = runtimeConfig.getGravity();
        if (gravity == 0.0) return 0.0;
        double buoyancy = baseConfig.getEnvironment().getBuoyancyStrength();

        double cellDensity = cell.getDensity();
        double mediumDensity = baseConfig.getEnvironment().getMediumDensity();
        double relativeDensity = (cellDensity - mediumDensity) / avoidZero(cellDensity);

        double acceleration = gravity * buoyancy * relativeDensity;

        return cell.getMass() * acceleration;
    }
}





