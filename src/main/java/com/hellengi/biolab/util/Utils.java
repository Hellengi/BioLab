package com.hellengi.biolab.util;

public final class Utils {
    private Utils() {}

    public static final double EPSILON = 0.000001;

    public static double avoidZero(double number) {
        return Math.max(number, EPSILON);
    }

    public static double wrapDegrees(double angle) {
        double wrapped = angle % 360.0;
        return wrapped < 0.0 ? wrapped + 360.0 : wrapped;
    }

    public static Velocity toVelocity(double directionAngle, double speed) {
        double angleRad = Math.toRadians(directionAngle - 90.0);
        return new Velocity(Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
    }

    public static Point clampInsideCircle(Point worldCenter, double worldRadius, double x, double y) {
        double dx = x - worldCenter.x();
        double dy = y - worldCenter.y();
        double distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= worldRadius || distance < EPSILON) {
            return new Point(x, y);
        }

        double nx = dx / distance;
        double ny = dy / distance;

        return new Point(
                worldCenter.x() + nx * worldRadius,
                worldCenter.y() + ny * worldRadius
        );
    }

    public record Point(double x, double y) {}

    public record Velocity(double vx, double vy) {}
}
