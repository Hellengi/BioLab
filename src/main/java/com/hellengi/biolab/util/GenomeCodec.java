package com.hellengi.biolab.util;

import com.hellengi.biolab.model.Genome;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class GenomeCodec {
    private static final String PREFIX = "CELL-";
    private static final int GENE_WIDTH = 3;
    private static final int RADIX = 36;

    private static final Pattern CODE_PATTERN = Pattern.compile(
            "^CELL-(?<payload>[0-9A-Z]+)$"
    );

    private GenomeCodec() {
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
        return PREFIX
                + pack(divisionThreshold)
                + pack(divisionImpulseStrength)
                + pack(colorHue)
                + pack(saturation)
                + pack(lightness)
                + pack(maxEnergy);
    }

    public static Genome decode(String code) {
        Matcher matcher = CODE_PATTERN.matcher(code);

        if (!matcher.matches()) {
            throw new IllegalArgumentException("Invalid genome code: " + code);
        }

        String payload = matcher.group("payload");

        if (payload.length() != GENE_WIDTH * 6) {
            throw new IllegalArgumentException("Invalid genome payload length: " + code);
        }

        return new Genome(
                unpack(payload, 0),
                unpack(payload, 1),
                unpack(payload, 2),
                unpack(payload, 3),
                unpack(payload, 4),
                unpack(payload, 5)
        );
    }

    private static int scale(double value) {
        return (int) Math.round(value * 10.0);
    }

    private static double unscale(String value) {
        return Integer.parseInt(value) / 10.0;
    }

    private static String pack(double value) {
        String encoded = Integer.toString(scale(value), RADIX).toUpperCase();

        if (encoded.length() > GENE_WIDTH) {
            throw new IllegalArgumentException("Genome value is too large for code: " + value);
        }

        return "0".repeat(GENE_WIDTH - encoded.length()) + encoded;
    }

    private static double unpack(String payload, int index) {
        int start = index * GENE_WIDTH;
        int end = start + GENE_WIDTH;

        return Integer.parseInt(payload.substring(start, end), RADIX) / 10.0;
    }
}