package com.hellengi.biolab.mapper.api;

import com.hellengi.biolab.api.dto.CellMotionDto;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.physics.Forces;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import static com.hellengi.biolab.util.Utils.EPSILON;

@Component
@RequiredArgsConstructor
public class CellMotionMapper {
    private final Forces forces;

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

        double dragForce = forces.calculateDragForce(vx, vy, cell.getRadius());
        double dragDirX = -speedDirX;
        double dragDirY = -speedDirY;

        double gravForce = forces.calculateGravForce(cell);
        double gravDirY = Math.signum(gravForce);

        return new CellMotionDto(
                speed,
                speedDirX,
                speedDirY,

                gravForce,
                0.0,
                gravDirY,

                dragForce,
                dragDirX,
                dragDirY,

                cell.getCollisionImpulseId(),
                cell.getCollisionImpulse(),
                cell.getCollisionNormalX(),
                cell.getCollisionNormalY()
        );
    }
}