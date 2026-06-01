package com.hellengi.biolab.domain.spatial;

/**
 * Axis-aligned rectangle used by the broad-phase spatial index.
 */
public final class SpatialBounds {
    private final double minX;
    private final double minY;
    private final double maxX;
    private final double maxY;

    private SpatialBounds(double minX, double minY, double maxX, double maxY) {
        this.minX = Math.min(minX, maxX);
        this.minY = Math.min(minY, maxY);
        this.maxX = Math.max(minX, maxX);
        this.maxY = Math.max(minY, maxY);
    }

    public static SpatialBounds fromMinMax(double minX, double minY, double maxX, double maxY) {
        return new SpatialBounds(minX, minY, maxX, maxY);
    }

    public static SpatialBounds fromCenterAndRadius(double x, double y, double radius) {
        double safeRadius = Math.max(0.0, radius);
        return new SpatialBounds(x - safeRadius, y - safeRadius, x + safeRadius, y + safeRadius);
    }

    public double minX() {
        return minX;
    }

    public double minY() {
        return minY;
    }

    public double maxX() {
        return maxX;
    }

    public double maxY() {
        return maxY;
    }

    public double centerX() {
        return (minX + maxX) * 0.5;
    }

    public double centerY() {
        return (minY + maxY) * 0.5;
    }

    public boolean intersects(SpatialBounds other) {
        return other.maxX >= minX
                && other.minX <= maxX
                && other.maxY >= minY
                && other.minY <= maxY;
    }

    public boolean contains(SpatialBounds other) {
        return other.minX >= minX
                && other.maxX <= maxX
                && other.minY >= minY
                && other.maxY <= maxY;
    }
}
