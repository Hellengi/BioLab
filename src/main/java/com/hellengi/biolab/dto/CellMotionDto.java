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

        double angularVelocity,
        double rotationalDragTorque,
        double flagellumForce,
        double flagellumTorque,
        double totalForce,
        double totalForceDirX,
        double totalForceDirY,
        double totalRotationalTorque,

        String gravityColor,
        String buoyancyColor,
        String dragColor,
        String rotationalDragColor,
        String impulseColor,
        String speedColor,
        String angularVelocityColor,
        String lightColor,
        String flagellumForceColor,
        String flagellumTorqueColor,
        String totalForceColor,
        String totalRotationalTorqueColor
) {
}


