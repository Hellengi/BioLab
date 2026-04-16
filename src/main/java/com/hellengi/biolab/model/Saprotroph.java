package com.hellengi.biolab.model;

public class Saprotroph extends Cell {

    private Genome genome;

    public Saprotroph(
            long id,
            double x,
            double y,
            double vx,
            double vy,
            double energy,
            Genome genome
    ) {
        super(id, x, y, vx, vy, energy, true);
        this.genome = genome;
    }

    public Genome getGenome() {
        return genome;
    }

    public void setGenome(Genome genome) {
        this.genome = genome;
    }
}
