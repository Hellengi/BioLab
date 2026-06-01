package com.hellengi.biolab.domain.spatial;

import java.util.ArrayList;
import java.util.List;

/**
 * Simple broad-phase Quadtree for 2D simulation objects.
 *
 * The tree stores each object together with its axis-aligned bounds. If an
 * object does not fit fully into a child node, it stays in the parent node.
 * This keeps the index correct for circles near quadrant borders and avoids
 * losing large cells.
 */
public final class Quadtree<T> {
    private static final int DEFAULT_NODE_CAPACITY = 12;
    private static final int DEFAULT_MAX_DEPTH = 10;

    private final BoundsProvider<T> boundsProvider;
    private final Node<T> root;

    public Quadtree(SpatialBounds bounds, BoundsProvider<T> boundsProvider) {
        this(bounds, boundsProvider, DEFAULT_NODE_CAPACITY, DEFAULT_MAX_DEPTH);
    }

    public Quadtree(
            SpatialBounds bounds,
            BoundsProvider<T> boundsProvider,
            int nodeCapacity,
            int maxDepth
    ) {
        this.boundsProvider = boundsProvider;
        this.root = new Node<>(bounds, Math.max(1, nodeCapacity), Math.max(1, maxDepth), 0);
    }

    public void insert(T item) {
        if (item == null) {
            return;
        }
        SpatialBounds itemBounds = boundsProvider.boundsOf(item);
        if (itemBounds == null) {
            return;
        }
        root.insert(new Entry<>(item, itemBounds));
    }

    public List<T> query(SpatialBounds area) {
        List<T> result = new ArrayList<>();
        query(area, result);
        return result;
    }

    public void query(SpatialBounds area, List<T> result) {
        if (area == null || result == null) {
            return;
        }
        root.query(area, result);
    }

    @FunctionalInterface
    public interface BoundsProvider<T> {
        SpatialBounds boundsOf(T item);
    }

    private static final class Entry<T> {
        private final T item;
        private final SpatialBounds bounds;

        private Entry(T item, SpatialBounds bounds) {
            this.item = item;
            this.bounds = bounds;
        }
    }

    private static final class Node<T> {
        private final SpatialBounds bounds;
        private final int capacity;
        private final int maxDepth;
        private final int depth;
        private final List<Entry<T>> entries = new ArrayList<>();
        private Node<T>[] children;

        private Node(SpatialBounds bounds, int capacity, int maxDepth, int depth) {
            this.bounds = bounds;
            this.capacity = capacity;
            this.maxDepth = maxDepth;
            this.depth = depth;
        }

        private void insert(Entry<T> entry) {
            if (!bounds.intersects(entry.bounds)) {
                return;
            }

            if (children != null) {
                Node<T> child = childContaining(entry.bounds);
                if (child != null) {
                    child.insert(entry);
                    return;
                }
            }

            entries.add(entry);

            if (entries.size() > capacity && depth < maxDepth) {
                subdivideIfNeeded();
                redistributeEntries();
            }
        }

        private void query(SpatialBounds area, List<T> result) {
            if (!bounds.intersects(area)) {
                return;
            }

            for (Entry<T> entry : entries) {
                if (entry.bounds.intersects(area)) {
                    result.add(entry.item);
                }
            }

            if (children == null) {
                return;
            }

            for (Node<T> child : children) {
                child.query(area, result);
            }
        }

        @SuppressWarnings("unchecked")
        private void subdivideIfNeeded() {
            if (children != null) {
                return;
            }

            double midX = bounds.centerX();
            double midY = bounds.centerY();

            children = new Node[] {
                    new Node<>(SpatialBounds.fromMinMax(bounds.minX(), bounds.minY(), midX, midY), capacity, maxDepth, depth + 1),
                    new Node<>(SpatialBounds.fromMinMax(midX, bounds.minY(), bounds.maxX(), midY), capacity, maxDepth, depth + 1),
                    new Node<>(SpatialBounds.fromMinMax(bounds.minX(), midY, midX, bounds.maxY()), capacity, maxDepth, depth + 1),
                    new Node<>(SpatialBounds.fromMinMax(midX, midY, bounds.maxX(), bounds.maxY()), capacity, maxDepth, depth + 1)
            };
        }

        private void redistributeEntries() {
            if (children == null || entries.isEmpty()) {
                return;
            }

            List<Entry<T>> keepInCurrentNode = new ArrayList<>();
            for (Entry<T> entry : entries) {
                Node<T> child = childContaining(entry.bounds);
                if (child == null) {
                    keepInCurrentNode.add(entry);
                } else {
                    child.insert(entry);
                }
            }

            entries.clear();
            entries.addAll(keepInCurrentNode);
        }

        private Node<T> childContaining(SpatialBounds area) {
            if (children == null) {
                return null;
            }

            for (Node<T> child : children) {
                if (child.bounds.contains(area)) {
                    return child;
                }
            }
            return null;
        }
    }
}
