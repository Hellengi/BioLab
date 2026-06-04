

package com.hellengi.biolab.dto;

public record CellMotionDto(
        double speed,
        double speedDirX,
        double speedDirY,

        double gravForce,
        double gravDirX,
        double gravDirY,

        double dragForce,
        double dragDirX,
        double dragDirY,

        String gravityColor,
        String buoyancyColor,
        String dragColor,
        String impulseColor,
        String speedColor,
        String lightColor
) {
}
