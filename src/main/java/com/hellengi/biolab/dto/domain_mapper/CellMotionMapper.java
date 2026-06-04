package com.hellengi.biolab.dto.domain_mapper;

import com.hellengi.biolab.domain.model.Cell;
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
    public static final String IMPULSE_ARROW_COLOR = "#2563eb";
    public static final String SPEED_ARROW_COLOR = "#e2e8f0";
    public static final String LIGHT_ARROW_COLOR = "#67e8f9";

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
                GRAVITY_ARROW_COLOR,
                BUOYANCY_ARROW_COLOR,
                DRAG_ARROW_COLOR,
                IMPULSE_ARROW_COLOR,
                SPEED_ARROW_COLOR,
                LIGHT_ARROW_COLOR
        );
    }
}
