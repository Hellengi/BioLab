package com.hellengi.biolab.domain.model;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.util.IdGenerator;
import lombok.Setter;
import lombok.Getter;

@Setter
@Getter
public class Food {
    private final long id;
    private final YamlConfig config;

    private double x;
    private double y;
    private double energy;
    private boolean markedForRemoval = false;
    private Long capturedByCellId = null;
    private int digestionSlotIndex = -1;
    private boolean insideLysosome = false;
    private double capturedCellX = Double.NaN;
    private double capturedCellY = Double.NaN;

    public Food(long id, YamlConfig config) {
        this.id = id;
        this.config = config;
        IdGenerator.advanceBeyond(id);
    }

    public Food(YamlConfig config) {
        this.id = IdGenerator.nextId();
        this.config = config;
    }

    public void setPosition(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public boolean isCaptured() {
        return capturedByCellId != null;
    }

    public boolean isCapturedBy(long cellId) {
        return capturedByCellId != null && capturedByCellId == cellId;
    }

    public void capture(long cellId, int slotIndex) {
        this.capturedByCellId = cellId;
        this.digestionSlotIndex = slotIndex;
        this.insideLysosome = false;
        clearCapturedCellAnchor();
    }

    public boolean hasCapturedCellAnchor() {
        return Double.isFinite(capturedCellX) && Double.isFinite(capturedCellY);
    }

    public void rememberCapturedCellPosition(double cellX, double cellY) {
        this.capturedCellX = cellX;
        this.capturedCellY = cellY;
    }

    public void translateWithCapturedCell(double cellX, double cellY) {
        if (hasCapturedCellAnchor()) {
            this.x += cellX - capturedCellX;
            this.y += cellY - capturedCellY;
        }
        rememberCapturedCellPosition(cellX, cellY);
    }

    public void clearCapturedCellAnchor() {
        this.capturedCellX = Double.NaN;
        this.capturedCellY = Double.NaN;
    }

    public void release() {
        this.capturedByCellId = null;
        this.digestionSlotIndex = -1;
        this.insideLysosome = false;
        clearCapturedCellAnchor();
    }

    public double getRadius() {
        double minEnergy = Math.max(0.1, config.getFood().getMinEnergy());
        return config.getFood().getBaseRadius() * Math.sqrt(Math.max(0.0, energy / minEnergy));
    }
}


