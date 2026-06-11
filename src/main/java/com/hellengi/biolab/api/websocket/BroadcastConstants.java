package com.hellengi.biolab.api.websocket;

public final class BroadcastConstants {
    public static final long SCHEDULER_POLL_INTERVAL_MS = 4L;
    public static final long METRICS_INTERVAL_MS = 100L;
    public static final long LIGHTING_FRAME_INTERVAL_MS = 100L;
    public static final long CELL_DETAILS_INTERVAL_MS = 100L;

    public static final int MAX_SKIPPED_SENDS_BEFORE_CLOSE = 120;

    public static final int SEND_EXECUTOR_THREADS = Math.max(2, Runtime.getRuntime().availableProcessors() / 2);
    public static final int SEND_EXECUTOR_QUEUE_CAPACITY = 4096;

    public static final double VIEWPORT_MARGIN_WORLD_UNITS = 128.0;
    public static final double VIEWPORT_GROUP_BUCKET_WORLD_UNITS = 96.0;

    public static final String LANE_RENDER = "render";
    public static final String LANE_LIGHTING = "lighting";
    public static final String LANE_DETAILS = "details";
    public static final String LANE_METRICS = "metrics";
    public static final String LANE_GENERIC = "generic";

    public static final String[] SEND_LANE_PRIORITY = {
            LANE_RENDER,
            LANE_LIGHTING,
            LANE_DETAILS,
            LANE_METRICS,
            LANE_GENERIC
    };

    private BroadcastConstants() {
    }
}
