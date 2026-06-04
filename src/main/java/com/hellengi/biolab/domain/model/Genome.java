package com.hellengi.biolab.domain.model;

import com.hellengi.biolab.domain.model.organelle.ChloroplastsOrganelle;
import com.hellengi.biolab.domain.model.organelle.CytosolOrganelle;
import com.hellengi.biolab.domain.model.organelle.LysosomeOrganelle;
import com.hellengi.biolab.domain.model.organelle.MembraneOrganelle;
import com.hellengi.biolab.domain.model.organelle.NucleusOrganelle;
import com.hellengi.biolab.domain.model.organelle.Organelle;
import com.hellengi.biolab.util.GenomeCodec;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class Genome {
    private NucleusOrganelle nucleus;
    private CytosolOrganelle cytosol;
    private MembraneOrganelle membrane;
    private ChloroplastsOrganelle chloroplasts;
    private LysosomeOrganelle lysosomes;

    public Genome(
            double divisionThreshold,
            double divisionImpulse,
            double divisionAngle,
            double maxEnergy,
            double dryMass,
            double elasticity,
            double gfp,
            boolean melaninEnabled,
            double melaninPercent,
            boolean chloroplastEnabled,
            double chloroplastAmount,
            double chlorophyll,
            double carotenoids,
            boolean lysosomeEnabled,
            double lysosomeAmount,
            double lysosomeEnzymeActivity
    ) {
        this(
                new NucleusOrganelle(divisionThreshold, divisionImpulse, divisionAngle),
                new CytosolOrganelle(maxEnergy, dryMass, gfp),
                new MembraneOrganelle(elasticity, melaninEnabled, melaninPercent),
                new ChloroplastsOrganelle(chloroplastEnabled, chloroplastAmount, chlorophyll, carotenoids),
                new LysosomeOrganelle(lysosomeEnabled, lysosomeAmount, lysosomeEnzymeActivity)
        );
    }

    public Genome(
            NucleusOrganelle nucleus,
            CytosolOrganelle cytosol,
            MembraneOrganelle membrane,
            ChloroplastsOrganelle chloroplasts,
            LysosomeOrganelle lysosomes
    ) {
        this.nucleus = nucleus;
        this.cytosol = cytosol;
        this.membrane = membrane;
        this.chloroplasts = chloroplasts;
        this.lysosomes = lysosomes;
    }

    public List<Organelle> organelles() {
        return List.of(nucleus, cytosol, membrane, chloroplasts, lysosomes);
    }

    public String getCode() {
        return GenomeCodec.encode(this);
    }

    public Genome copy() {
        return new Genome(
                nucleus.copy(),
                cytosol.copy(),
                membrane.copy(),
                chloroplasts.copy(),
                lysosomes.copy()
        );
    }

    public double getDivisionThreshold() { return nucleus.getDivisionThreshold(); }
    public void setDivisionThreshold(double value) { nucleus.setDivisionThreshold(value); }

    public double getDivisionImpulse() { return nucleus.getDivisionImpulse(); }
    public void setDivisionImpulse(double value) { nucleus.setDivisionImpulse(value); }

    public double getDivisionAngle() { return nucleus.getDivisionAngle(); }
    public void setDivisionAngle(double value) { nucleus.setDivisionAngle(value); }

    public double getMaxEnergy() { return cytosol.getMaxEnergy(); }
    public void setMaxEnergy(double value) { cytosol.setMaxEnergy(value); }

    public double getDryMass() { return cytosol.getDryMass(); }
    public void setDryMass(double value) { cytosol.setDryMass(value); }

    public double getGfp() { return cytosol.getGfp(); }
    public void setGfp(double value) { cytosol.setGfp(value); }

    public double getElasticity() { return membrane.getElasticity(); }
    public void setElasticity(double value) { membrane.setElasticity(value); }

    public boolean isMelaninEnabled() { return membrane.isMelaninEnabled(); }
    public void setMelaninEnabled(boolean value) { membrane.setMelaninEnabled(value); }

    public double getMelaninPercent() { return membrane.getMelaninPercent(); }
    public void setMelaninPercent(double value) { membrane.setMelaninPercent(value); }

    public boolean isChloroplastEnabled() { return chloroplasts.isEnabled(); }
    public void setChloroplastEnabled(boolean value) { chloroplasts.setEnabled(value); }

    public double getChloroplastAmount() { return chloroplasts.getAmount(); }
    public void setChloroplastAmount(double value) { chloroplasts.setAmount(value); }

    public double getChlorophyll() { return chloroplasts.getChlorophyll(); }
    public void setChlorophyll(double value) { chloroplasts.setChlorophyll(value); }

    public double getCarotenoids() { return chloroplasts.getCarotenoids(); }
    public void setCarotenoids(double value) { chloroplasts.setCarotenoids(value); }

    public boolean isLysosomeEnabled() { return lysosomes.isEnabled(); }
    public void setLysosomeEnabled(boolean value) { lysosomes.setEnabled(value); }

    public double getLysosomeAmount() { return lysosomes.getAmount(); }
    public void setLysosomeAmount(double value) { lysosomes.setAmount(value); }

    public double getLysosomeEnzymeActivity() { return lysosomes.getEnzymeActivity(); }
    public void setLysosomeEnzymeActivity(double value) { lysosomes.setEnzymeActivity(value); }
}
