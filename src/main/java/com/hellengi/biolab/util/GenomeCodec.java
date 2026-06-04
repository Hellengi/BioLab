package com.hellengi.biolab.util;

import com.hellengi.biolab.domain.model.Genome;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class GenomeCodec {
    private static final String PREFIX = "CELL-";
    private static final int GENE_WIDTH = 3;
    private static final int RADIX = 36;
    private static final int CURRENT_GENE_COUNT = 16;

    private static final Pattern CODE_PATTERN = Pattern.compile(
            "^CELL-(?<payload>[0-9A-Z]+)$"
    );

    private GenomeCodec() {
    }

    public static String encode(Genome genome) {
        return PREFIX
                + pack(genome.getDivisionThreshold())
                + pack(genome.getDivisionImpulse())
                + pack(genome.getDivisionAngle())
                + pack(genome.getMaxEnergy())
                + pack(genome.getDryMass())
                + pack(genome.getElasticity())
                + pack(genome.getGfp())
                + pack(genome.isMelaninEnabled() ? 1.0 : 0.0)
                + pack(genome.getMelaninPercent())
                + pack(genome.isChloroplastEnabled() ? 1.0 : 0.0)
                + pack(genome.getChloroplastAmount())
                + pack(genome.getChlorophyll())
                + pack(genome.getCarotenoids())
                + pack(genome.isLysosomeEnabled() ? 1.0 : 0.0)
                + pack(genome.getLysosomeAmount())
                + pack(genome.getLysosomeEnzymeActivity());
    }

    public static Genome decode(String code) {
        Matcher matcher = CODE_PATTERN.matcher(code);

        if (!matcher.matches()) {
            throw new IllegalArgumentException("Invalid genome code: " + code);
        }

        String payload = matcher.group("payload");
        int geneCount = payload.length() / GENE_WIDTH;

        if (payload.length() % GENE_WIDTH != 0 || geneCount != CURRENT_GENE_COUNT) {
            throw new IllegalArgumentException("Invalid genome payload length: " + code);
        }

        return new Genome(
                unpack(payload, 0),
                unpack(payload, 1),
                unpack(payload, 2),
                unpack(payload, 3),
                unpack(payload, 4),
                unpack(payload, 5),
                unpack(payload, 6),
                unpack(payload, 7) >= 0.5,
                unpack(payload, 8),
                unpack(payload, 9) >= 0.5,
                unpack(payload, 10),
                unpack(payload, 11),
                unpack(payload, 12),
                unpack(payload, 13) >= 0.5,
                unpack(payload, 14),
                unpack(payload, 15)
        );
    }

    private static int scale(double value) {
        return (int) Math.round(value * 10.0);
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
