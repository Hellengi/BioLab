package com.hellengi.biolab.simulation.world;

import com.hellengi.biolab.model.DeadCell;
import com.hellengi.biolab.model.Food;
import com.hellengi.biolab.model.Cell;
import lombok.Setter;
import lombok.Getter;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Setter
@Getter
@Component
public class SimulationEnvironment {
    private final List<Cell> cells = new ArrayList<>();
    private final List<DeadCell> deadCells = new ArrayList<>();
    private final List<Food> foods = new ArrayList<>();

    private boolean running = false;
    private long tick = 0L;
    private long lastSimulationStepTimeMs = System.currentTimeMillis();

    public void incrementTick() {
        this.tick++;
    }

    public void clear() {
        cells.clear();
        deadCells.clear();
        foods.clear();
    }
}