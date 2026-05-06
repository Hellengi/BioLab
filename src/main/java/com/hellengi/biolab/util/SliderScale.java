package com.hellengi.biolab.util;

public final class SliderScale {

    private SliderScale() {}

    public static double linear(int slider, double min, double max) {
        int clamped = clamp(slider);
        return min + (clamped / 100.0) * (max - min);
    }

    public static double exponential(int slider, double maxMultiplier) {
        int clamped = clamp(slider);
        if (clamped == 0) return 0.0;
        double normalized = clamped / 50.0 - 1.0;
        return Math.pow(Math.max(1.0, maxMultiplier), normalized);
    }

    private static int clamp(int slider) {
        return Math.max(0, Math.min(100, slider));
    }
}