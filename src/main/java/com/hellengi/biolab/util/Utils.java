package com.hellengi.biolab.util;

public final class Utils {
    private Utils() {}

    public static final double EPSILON = 0.000001;

    public static double avoidZero(double number) {
        return Math.max(number, EPSILON);
    }
}
