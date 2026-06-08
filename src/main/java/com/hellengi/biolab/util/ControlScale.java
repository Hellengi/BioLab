package com.hellengi.biolab.util;

import com.hellengi.biolab.config.YamlConfig;

import java.util.Locale;
import java.util.Random;

public final class ControlScale {
    public static final String LINEAR = "linear";
    public static final String LOGARITHMIC = "logarithmic";
    private static final double SIGNED_LOG_K = 3.0;

    private ControlScale() {
    }

    public static String normalizedScale(YamlConfig.Control control) {
        if (control == null || control.getScale() == null || control.getScale().isBlank()) {
            return LINEAR;
        }
        String scale = control.getScale().trim().toLowerCase(Locale.ROOT);
        return LOGARITHMIC.equals(scale) ? LOGARITHMIC : LINEAR;
    }

    public static boolean logarithmic(YamlConfig.Control control) {
        return LOGARITHMIC.equals(normalizedScale(control));
    }

    public static double randomValue(YamlConfig.Control control, Random random) {
        double min = Math.min(control.getMin(), control.getMax());
        double max = Math.max(control.getMin(), control.getMax());
        if (!logarithmic(control)) {
            return roundToStep(min + random.nextDouble() * (max - min), control);
        }

        double raw;
        if (min < 0.0 && max > 0.0) {
            raw = -100.0 + random.nextDouble() * 200.0;
            return roundToStep(valueFromTechnical(raw, control), control);
        }
        if (min > 0.0 && max > min) {
            raw = random.nextDouble() * 100.0;
            return roundToStep(valueFromTechnical(raw, control), control);
        }
        return roundToStep(min + random.nextDouble() * (max - min), control);
    }

    public static double mutateValue(double value, double sigma, YamlConfig.Control control, Random random) {
        if (!logarithmic(control)) {
            return roundToStep(clamp(value + random.nextGaussian() * sigma, control), control);
        }

        double min = Math.min(control.getMin(), control.getMax());
        double max = Math.max(control.getMin(), control.getMax());
        if ((min < 0.0 && max > 0.0) || (min > 0.0 && max > min)) {
            double technical = technicalFromValue(value, control);
            double mutated = technical + random.nextGaussian() * Math.max(0.0, sigma);
            double technicalMin = min < 0.0 && max > 0.0 ? -100.0 : 0.0;
            double technicalMax = 100.0;
            return roundToStep(valueFromTechnical(Math.max(technicalMin, Math.min(technicalMax, mutated)), control), control);
        }
        return roundToStep(clamp(value + random.nextGaussian() * sigma, control), control);
    }

    public static double valueFromTechnical(double raw, YamlConfig.Control control) {
        double min = Math.min(control.getMin(), control.getMax());
        double max = Math.max(control.getMin(), control.getMax());
        if (!logarithmic(control)) {
            return clamp(raw, control);
        }

        if (min < 0.0 && max > 0.0) {
            double maxAbs = Math.max(Math.abs(min), Math.abs(max));
            double tech = Math.max(-100.0, Math.min(100.0, raw));
            double sign = tech < 0.0 ? -1.0 : 1.0;
            double x = Math.abs(tech) / 100.0;
            double value = sign * maxAbs * (Math.exp(SIGNED_LOG_K * x) - 1.0) / (Math.exp(SIGNED_LOG_K) - 1.0);
            return clamp(value, control);
        }

        if (min > 0.0 && max > min) {
            double t = Math.max(0.0, Math.min(100.0, raw)) / 100.0;
            return clamp(Math.exp(Math.log(min) + t * (Math.log(max) - Math.log(min))), control);
        }

        return clamp(raw, control);
    }

    public static double technicalFromValue(double value, YamlConfig.Control control) {
        double min = Math.min(control.getMin(), control.getMax());
        double max = Math.max(control.getMin(), control.getMax());
        double v = clamp(value, control);
        if (!logarithmic(control)) {
            return v;
        }

        if (min < 0.0 && max > 0.0) {
            double maxAbs = Math.max(Math.abs(min), Math.abs(max));
            if (maxAbs <= 0.0) return 0.0;
            double sign = v < 0.0 ? -1.0 : 1.0;
            double y = Math.min(1.0, Math.abs(v) / maxAbs);
            return sign * 100.0 * Math.log(1.0 + y * (Math.exp(SIGNED_LOG_K) - 1.0)) / SIGNED_LOG_K;
        }

        if (min > 0.0 && max > min) {
            return 100.0 * (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min));
        }

        return v;
    }

    public static double roundToStep(double value, YamlConfig.Control control) {
        double clamped = clamp(value, control);
        double step = control.getStep();
        if (step <= 0.0) {
            return clamped;
        }
        double min = Math.min(control.getMin(), control.getMax());
        double rounded = Math.round((clamped - min) / step) * step + min;
        return clamp(roundToDecimals(rounded, step), control);
    }

    public static double clamp(double value, YamlConfig.Control control) {
        double min = Math.min(control.getMin(), control.getMax());
        double max = Math.max(control.getMin(), control.getMax());
        return Math.max(min, Math.min(max, value));
    }

    private static double roundToDecimals(double value, double step) {
        String text = Double.toString(step);
        int decimals = 0;
        int dot = text.indexOf('.');
        if (dot >= 0) {
            decimals = text.length() - dot - 1;
        }
        double factor = Math.pow(10.0, Math.min(9, Math.max(0, decimals)));
        return Math.round(value * factor) / factor;
    }
}
