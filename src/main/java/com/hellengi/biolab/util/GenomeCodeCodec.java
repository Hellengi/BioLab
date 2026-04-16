package com.hellengi.biolab.util;

import com.hellengi.biolab.model.Genome;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class GenomeCodeCodec {

    private static final Pattern CODE_PATTERN = Pattern.compile(
            "^SPR-D(?<d>\\d{4})-I(?<i>\\d{4})-H(?<h>\\d{4})-L(?<l>\\d{4})-M(?<m>\\d{4})$"
    );

    private GenomeCodeCodec() {
    }

    public static String encode(Genome genome) {
        return "SPR-D%04d-I%04d-H%04d-L%04d-M%04d".formatted(
                scale(genome.getDivisionThreshold()),
                scale(genome.getDivisionImpulseStrength()),
                scale(genome.getColorHue()),
                scale(genome.getLightness()),
                scale(genome.getMaxEnergy())
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