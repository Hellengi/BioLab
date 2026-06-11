package com.hellengi.biolab.util;

import com.hellengi.biolab.domain.model.Genome;

public final class GenomeCodec {
    private static final String PREFIX = "CELL-";
    private static final int GENE_WIDTH = 3;
    private static final int RADIX = 36;

    private GenomeCodec() {
    }

    public static String encode(Genome genome) {
        return PREFIX
                + pack(genome.getDivisionThreshold())
                + pack(genome.getDivisionImpulse())
                + pack(genome.getDivisionAngle())
                + pack(genome.getCytosolArea())
                + pack(genome.getCytosolDensity())
                + pack(genome.getElasticity())
                + pack(genome.isBioluminescenceEnabled() ? 1.0 : 0.0)
                + pack(genome.getBioluminescence())
                + pack(genome.isMelaninEnabled() ? 1.0 : 0.0)
                + pack(genome.getMelaninPercent())
                + pack(genome.isChloroplastEnabled() ? 1.0 : 0.0)
                + pack(genome.getChloroplastAmount())
                + pack(genome.getChlorophyll())
                + pack(genome.getCarotenoids())
                + pack(genome.isLysosomeEnabled() ? 1.0 : 0.0)
                + pack(genome.getLysosomeAmount())
                + pack(genome.getLysosomeEnzymeActivity())
                + pack(genome.isFlagellumEnabled() ? 1.0 : 0.0)
                + pack(genome.getFlagellumCount())
                + pack(genome.getFlagellumLength())
                + pack(genome.getFlagellumMotorPower())
                + pack(genome.getFlagellumPairSpreadAngle())
                + pack(genome.getFlagellumSteeringAsymmetry() + 100.0);
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
}
