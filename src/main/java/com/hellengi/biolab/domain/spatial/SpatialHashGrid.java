package com.hellengi.biolab.domain.spatial;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;
import java.util.function.ToDoubleFunction;

/**
 * Allocation-light center based spatial hash for hot simulation broad phases.
 *
 * <p>Objects are stored by their center bucket. Queries expand by an explicit
 * radius, so callers that know the maximum target radius can keep exact
 * collision/capture checks outside the index without duplicating large objects
 * into many buckets.</p>
 */
public final class SpatialHashGrid<T> {
    private static final double MIN_BUCKET_SIZE = 1.0;

    private final ToDoubleFunction<T> xProvider;
    private final ToDoubleFunction<T> yProvider;
    private final Map<Long, List<T>> buckets = new HashMap<>();
    private double bucketSize = MIN_BUCKET_SIZE;
    private double inverseBucketSize = 1.0;

    public SpatialHashGrid(ToDoubleFunction<T> xProvider, ToDoubleFunction<T> yProvider) {
        this.xProvider = xProvider;
        this.yProvider = yProvider;
    }

    public void clear() {
        buckets.clear();
    }

    public void rebuild(Iterable<T> items, double bucketSize, Predicate<T> include) {
        clear();
        configure(bucketSize);
        if (items == null) {
            return;
        }
        for (T item : items) {
            if (item != null && (include == null || include.test(item))) {
                insert(item);
            }
        }
    }

    public List<SpatialBounds> bucketBounds() {
        List<SpatialBounds> bounds = new ArrayList<>(buckets.size());
        for (Long key : buckets.keySet()) {
            int bucketX = (int) (key >> 32);
            int bucketY = key.intValue();
            double minX = bucketX * bucketSize;
            double minY = bucketY * bucketSize;
            bounds.add(SpatialBounds.fromMinMax(minX, minY, minX + bucketSize, minY + bucketSize));
        }
        return bounds;
    }

    public void queryCircle(double x, double y, double radius, List<T> result) {
        if (result == null || !Double.isFinite(x) || !Double.isFinite(y)) {
            return;
        }
        double safeRadius = Math.max(0.0, Double.isFinite(radius) ? radius : 0.0);
        int minBucketX = bucketCoordinate(x - safeRadius);
        int maxBucketX = bucketCoordinate(x + safeRadius);
        int minBucketY = bucketCoordinate(y - safeRadius);
        int maxBucketY = bucketCoordinate(y + safeRadius);

        for (int bucketY = minBucketY; bucketY <= maxBucketY; bucketY++) {
            for (int bucketX = minBucketX; bucketX <= maxBucketX; bucketX++) {
                List<T> bucket = buckets.get(bucketKey(bucketX, bucketY));
                if (bucket != null) {
                    result.addAll(bucket);
                }
            }
        }
    }

    private void configure(double requestedBucketSize) {
        bucketSize = Math.max(MIN_BUCKET_SIZE, Double.isFinite(requestedBucketSize) ? requestedBucketSize : MIN_BUCKET_SIZE);
        inverseBucketSize = 1.0 / bucketSize;
    }

    private void insert(T item) {
        double x = xProvider.applyAsDouble(item);
        double y = yProvider.applyAsDouble(item);
        if (!Double.isFinite(x) || !Double.isFinite(y)) {
            return;
        }
        long key = bucketKey(bucketCoordinate(x), bucketCoordinate(y));
        buckets.computeIfAbsent(key, ignored -> new ArrayList<>()).add(item);
    }

    private int bucketCoordinate(double coordinate) {
        return (int) Math.floor(coordinate * inverseBucketSize);
    }

    private static long bucketKey(int bucketX, int bucketY) {
        return ((long) bucketX << 32) ^ (bucketY & 0xffffffffL);
    }
}
