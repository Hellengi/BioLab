
package com.hellengi.biolab.domain.model;

import com.hellengi.biolab.domain.model.organelle.ChloroplastsOrganelle;
import com.hellengi.biolab.domain.model.organelle.FlagellaOrganelle;
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
    private FlagellaOrganelle flagella;

    public Genome(
            double divisionThreshold,
            double divisionImpulse,
            double divisionAngle,
            double cytosolArea,
            double cytosolDensity,
            boolean gfpEnabled,
            double gfp,
            double elasticity,
            boolean melaninEnabled,
            double melaninPercent,
            boolean chloroplastEnabled,
            double chloroplastAmount,
            double chlorophyll,
            double carotenoids,
            boolean lysosomeEnabled,
            double lysosomeAmount,
            double lysosomeEnzymeActivity,
            boolean flagellumEnabled,
            double flagellumCount,
            double flagellumLength,
            double flagellumMotorPower,
            double flagellumPairSpreadAngle,
            double flagellumSteeringAsymmetry
    ) {
        this(
                new NucleusOrganelle(divisionThreshold, divisionImpulse, divisionAngle),
                new CytosolOrganelle(cytosolArea, cytosolDensity, gfpEnabled, gfp),
                new MembraneOrganelle(elasticity, melaninEnabled, melaninPercent),
                new ChloroplastsOrganelle(chloroplastEnabled, chloroplastAmount, chlorophyll, carotenoids),
                new LysosomeOrganelle(lysosomeEnabled, lysosomeAmount, lysosomeEnzymeActivity),
                new FlagellaOrganelle(
                        flagellumEnabled,
                        flagellumCount,
                        flagellumLength,
                        flagellumMotorPower,
                        flagellumPairSpreadAngle,
                        flagellumSteeringAsymmetry
                )
        );
    }

    public Genome(
            NucleusOrganelle nucleus,
            CytosolOrganelle cytosol,
            MembraneOrganelle membrane,
            ChloroplastsOrganelle chloroplasts,
            LysosomeOrganelle lysosomes,
            FlagellaOrganelle flagella
    ) {
        this.nucleus = nucleus;
        this.cytosol = cytosol;
        this.membrane = membrane;
        this.chloroplasts = chloroplasts;
        this.lysosomes = lysosomes;
        this.flagella = flagella;
    }

    public List<Organelle> organelles() {
        return List.of(nucleus, cytosol, membrane, chloroplasts, lysosomes, flagella);
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
                lysosomes.copy(),
                flagella.copy()
        );
    }

    public double getDivisionThreshold() { return nucleus.getDivisionThreshold(); }
    public void setDivisionThreshold(double value) { nucleus.setDivisionThreshold(value); }

    public double getDivisionImpulse() { return nucleus.getDivisionImpulse(); }
    public void setDivisionImpulse(double value) { nucleus.setDivisionImpulse(value); }

    public double getDivisionAngle() { return nucleus.getDivisionAngle(); }
    public void setDivisionAngle(double value) { nucleus.setDivisionAngle(value); }

    public double getCytosolArea() { return cytosol.getArea(); }
    public void setCytosolArea(double value) { cytosol.setArea(value); }

    public double getCytosolDensity() { return cytosol.getDensity(); }
    public void setCytosolDensity(double value) { cytosol.setDensity(value); }

    public boolean isGfpEnabled() { return cytosol.isGfpEnabled(); }
    public void setGfpEnabled(boolean value) { cytosol.setGfpEnabled(value); }

    public double getGfp() { return cytosol.getGfp(); }
    public void setGfp(double value) { cytosol.setGfp(value); }

    public double getMaxEnergy() { return cytosol.maxEnergy(); }

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

    public boolean isFlagellumEnabled() { return flagella.isEnabled(); }
    public void setFlagellumEnabled(boolean value) { flagella.setEnabled(value); }

    public double getFlagellumCount() { return flagella.getCount(); }
    public void setFlagellumCount(double value) { flagella.setCount(Math.max(1, Math.min(FlagellaOrganelle.MAX_FLAGELLA, (int) Math.round(value)))); }

    public double getFlagellumLength() { return flagella.getLength(); }
    public void setFlagellumLength(double value) { flagella.setLength(value); }

    public double getFlagellumMotorPower() { return flagella.getMotorPower(); }
    public void setFlagellumMotorPower(double value) { flagella.setMotorPower(value); }


    public double getFlagellumPairSpreadAngle() { return flagella.getPairSpreadAngle(); }
    public void setFlagellumPairSpreadAngle(double value) { flagella.setPairSpreadAngle(value); }

    public double getFlagellumSteeringAsymmetry() { return flagella.getSteeringAsymmetry(); }
    public void setFlagellumSteeringAsymmetry(double value) { flagella.setSteeringAsymmetry(value); }
}





