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
                -speedDirY
        );
    }
}
