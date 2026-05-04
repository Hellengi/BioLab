package com.hellengi.biolab.util;

import com.hellengi.biolab.model.Genome;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class GenomeCodeCodec {

    private static final Pattern CODE_PATTERN = Pattern.compile(
            "^CELL-D(?<d>\\d+)-I(?<i>\\d+)-H(?<h>\\d+)-S(?<s>\\d+)-L(?<l>\\d+)-M(?<m>\\d+)$"
    );

    private GenomeCodeCodec() {
    }

    public static String encode(Genome genome) {
        return encode(
                genome.getDivisionThreshold(),
                genome.getDivisionImpulseStrength(),
                genome.getColorHue(),
                genome.getSaturation(),
                genome.getLightness(),
                genome.getMaxEnergy()
        );
    }

    public static String encode(
            double divisionThreshold,
            double divisionImpulseStrength,
            double colorHue,
            double saturation,
            double lightness,
            double maxEnergy
    ) {
        return "CELL-D%04d-I%04d-H%04d-S%04d-L%04d-M%04d".formatted(
                scale(divisionThreshold),
                scale(divisionImpulseStrength),
                scale(colorHue),
                scale(saturation),
                scale(lightness),
                scale(maxEnergy)
        );
    }

    public static Genome decode(String code) {
        Matcher matcher = CODE_PATTERN.matcher(code);

        if (!matcher.matches()) {
            throw new IllegalArgumentException("Invalid genome code: " + code);
        }

        return new Genome(
                unscale(matcher.group("d")),
                unscale(matcher.group("i")),
                unscale(matcher.group("h")),
                unscale(matcher.group("s")),
                unscale(matcher.group("l")),
                unscale(matcher.group("m"))
        );
    }

    private static int scale(double value) {
        return (int) Math.round(value * 10.0);
    }

    private static double unscale(String value) {
        return Integer.parseInt(value) / 10.0;
    }
}