package com.hellengi.biolab.api.websocket.protocol;

public final class BinaryRenderProtocol {
    public static final int MAGIC = 0x424C5231; // BLR1
    public static final short VERSION = 2;
    public static final byte MESSAGE_RENDER_FRAME = 1;

    public static final long NULL_LONG = Long.MIN_VALUE;
    public static final double NULL_DOUBLE = Double.NaN;

    public static final byte LIGHT_SOURCE_EDGE = 0;
    public static final byte LIGHT_SOURCE_POINT = 1;

    public static final byte FLAG_DEAD = 1;
    public static final byte FLAG_FOOD_CONSUMED = 1;
    public static final byte FLAG_FOOD_INSIDE_LYSOSOME = 2;

    private BinaryRenderProtocol() {
    }
}
