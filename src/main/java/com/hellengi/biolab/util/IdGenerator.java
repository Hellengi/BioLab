package com.hellengi.biolab.util;

import java.util.concurrent.atomic.AtomicLong;

public final class IdGenerator {
    private static final AtomicLong SEQUENCE = new AtomicLong(1);

    private IdGenerator() {
    }

    public static long nextId() {
        return SEQUENCE.getAndIncrement();
    }

    public static void advanceBeyond(long restoredId) {
        if (restoredId == Long.MAX_VALUE) {
            throw new IllegalStateException("Cannot allocate an id after Long.MAX_VALUE");
        }
        SEQUENCE.accumulateAndGet(restoredId + 1, Math::max);
    }
}
