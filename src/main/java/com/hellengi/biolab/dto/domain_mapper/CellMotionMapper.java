package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.FlagellumSlot;
import com.hellengi.biolab.domain.physics.MotionForces;
import com.hellengi.biolab.dto.CellMotionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import static com.hellengi.biolab.util.Utils.*;

@Component
@RequiredArgsConstructor
public class CellMotionMapper {
    public static final String GRAVITY_ARROW_COLOR = "#f87171";
    public static final String BUOYANCY_ARROW_COLOR = "#4ade80";
    public static final String DRAG_ARROW_COLOR = "#fbbf24";
    public static final String ROTATIONAL_DRAG_ARROW_COLOR = DRAG_ARROW_COLOR;
    public static final String IMPULSE_ARROW_COLOR = "#2563eb";
    public static final String SPEED_ARROW_COLOR = "#e2e8f0";
    public static final String ANGULAR_VELOCITY_ARROW_COLOR = SPEED_ARROW_COLOR;
    public static final String LIGHT_ARROW_COLOR = "#67e8f9";
    public static final String FLAGELLUM_FORCE_ARROW_COLOR = "#f59e0b";
    public static final String FLAGELLUM_TORQUE_ARROW_COLOR = "#f97316";
    public static final String TOTAL_FORCE_ARROW_COLOR = "#f8fafc";
    public static final String TOTAL_ROTATIONAL_TORQUE_ARROW_COLOR = "#fb7185";

    private final MotionForces motionForces;

    public CellMotionDto toDto(Cell cell) {
        double vx = cell.getVx();
        double vy = cell.getVy();
        double speed = Math.hypot(vx, vy);

        double speedDirX = 0.0;
        double speedDirY = 0.0;
        if (speed > EPSILON) {
            speedDirX = vx / speed;
            speedDirY = vy / speed;
        }

        double dragForce = motionForces.calculateDragForce(vx, vy, cell.getRadius());
        double gravForce = motionForces.calculateGravForce(cell);
        double rotationalDragTorque = motionForces.calculateRotationalDragTorque(cell);

        double flagellumForce = 0.0;
        double flagellumForceX = 0.0;
        double flagellumForceY = 0.0;
        double signedFlagellumTorque = 0.0;
        for (FlagellumSlot slot : cell.getFlagellumSlots()) {
            double force = slot.getLastForce();
            flagellumForce += force;
            flagellumForceX += force * slot.getLastDirectionX();
            flagellumForceY += force * slot.getLastDirectionY();
            signedFlagellumTorque += slot.getLastTorque();
        }

        double dragForceX = dragForce * -speedDirX;
        double dragForceY = dragForce * -speedDirY;
        double totalForceX = flagellumForceX + dragForceX;
        double totalForceY = flagellumForceY + dragForceY + gravForce;
        double totalForce = Math.hypot(totalForceX, totalForceY);
        double totalForceDirX = totalForce > EPSILON ? totalForceX / totalForce : 0.0;
        double totalForceDirY = totalForce > EPSILON ? totalForceY / totalForce : 0.0;

        double signedRotationalDragTorque = -Math.signum(cell.getAngularVelocity()) * rotationalDragTorque;
        double totalRotationalTorque = signedFlagellumTorque + signedRotationalDragTorque;

        return new CellMotionDto(
                speed,
                speedDirX,
                speedDirY,
                gravForce,
                0.0,
                Math.signum(gravForce),
                dragForce,
                -speedDirX,
                -speedDirY,
                cell.getAngularVelocity(),
                rotationalDragTorque,
                flagellumForce,
                signedFlagellumTorque,
                totalForce,
                totalForceDirX,
                totalForceDirY,
                totalRotationalTorque,
                GRAVITY_ARROW_COLOR,
                BUOYANCY_ARROW_COLOR,
                DRAG_ARROW_COLOR,
                ROTATIONAL_DRAG_ARROW_COLOR,
                IMPULSE_ARROW_COLOR,
                SPEED_ARROW_COLOR,
                ANGULAR_VELOCITY_ARROW_COLOR,
                LIGHT_ARROW_COLOR,
                FLAGELLUM_FORCE_ARROW_COLOR,
                FLAGELLUM_TORQUE_ARROW_COLOR,
                TOTAL_FORCE_ARROW_COLOR,
                TOTAL_ROTATIONAL_TORQUE_ARROW_COLOR
        );
    }
}
