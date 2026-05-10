package com.hellengi.biolab.api.dto;

public record CellMotionDto(
        double speed,

        double gravityBuoyancyForce,
        double gravityBuoyancyDirX,
        double gravityBuoyancyDirY,

        double dragForce,
        double dragDirX,
        double dragDirY,

        double velocityDirX,
        double velocityDirY,

        long collisionImpulseId,
        double collisionImpulse,
        double collisionNormalX,
        double collisionNormalY
) {
}