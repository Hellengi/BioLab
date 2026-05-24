package com.hellengi.biolab.api.dto;

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

        long collisionImpulseId,
        double collisionImpulse,
        double collisionNormalX,
        double collisionNormalY
) {
}