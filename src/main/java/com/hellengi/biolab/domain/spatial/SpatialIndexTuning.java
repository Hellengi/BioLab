package com.hellengi.biolab.domain.spatial;

public final class SpatialIndexTuning {
    public static final double MIN_COLLISION_BUCKET_SIZE = 16.0;
    public static final double COLLISION_BUCKET_DIAMETER_FACTOR = 2.0;

    private SpatialIndexTuning() {
    }

    public static double collisionBucketSize(double maxRadius) {
        return Math.max(MIN_COLLISION_BUCKET_SIZE, Math.max(0.0, maxRadius) * COLLISION_BUCKET_DIAMETER_FACTOR);
    }
}
