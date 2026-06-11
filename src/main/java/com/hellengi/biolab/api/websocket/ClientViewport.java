package com.hellengi.biolab.api.websocket;

/**
 * World-space viewport sent by the browser. The server uses it only to reduce
 * realtime render payloads. Data outside the viewport is still simulated and is
 * still available through snapshots/details.
 */
public record ClientViewport(
        double minX,
        double minY,
        double maxX,
        double maxY,
        double margin
) {
    public static final ClientViewport FULL_WORLD = new ClientViewport(
            Double.NEGATIVE_INFINITY,
            Double.NEGATIVE_INFINITY,
            Double.POSITIVE_INFINITY,
            Double.POSITIVE_INFINITY,
            0.0
    );

    public ClientViewport normalized(double fallbackMargin) {
        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
            return FULL_WORLD;
        }

        double left = Math.min(minX, maxX);
        double right = Math.max(minX, maxX);
        double top = Math.min(minY, maxY);
        double bottom = Math.max(minY, maxY);
        double safeMargin = Math.max(0.0, isFinite(margin) ? margin : fallbackMargin);

        return new ClientViewport(left, top, right, bottom, safeMargin);
    }

    public boolean isFullWorld() {
        return !isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY);
    }

    public boolean intersectsCircle(double x, double y, double radius) {
        if (isFullWorld()) {
            return true;
        }
        double r = Math.max(0.0, radius) + Math.max(0.0, margin);
        return x + r >= minX
                && x - r <= maxX
                && y + r >= minY
                && y - r <= maxY;
    }

    /**
     * Buckets nearby camera positions together so clients can reuse the same
     * render payload while panning slowly. Exact bounds are unnecessary because
     * a margin is always included.
     */
    public ClientViewport bucketed(double bucketSize) {
        if (isFullWorld()) {
            return FULL_WORLD;
        }
        double b = Math.max(1.0, bucketSize);
        return new ClientViewport(
                Math.floor(minX / b) * b,
                Math.floor(minY / b) * b,
                Math.ceil(maxX / b) * b,
                Math.ceil(maxY / b) * b,
                Math.ceil(margin / b) * b
        );
    }

    private static boolean isFinite(double value) {
        return Double.isFinite(value);
    }
}
