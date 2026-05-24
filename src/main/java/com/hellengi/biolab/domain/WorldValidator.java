package com.hellengi.biolab.domain;

import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.Food;
import org.springframework.stereotype.Component;

/** Emergency validation stage. Any output here indicates a simulation defect. */
@Component
final class WorldValidator {
    void markInvalidObjects(SimulationWorld world) {
        for (Cell cell : world.getCells()) {
            if (!isFiniteCell(cell)) {
                cell.setMarkedForRemoval(true);
                System.err.println("Invalid cell object detected: id=" + cell.getId());
            }
        }
        for (Food food : world.getFoods()) {
            if (!isFiniteFood(food)) {
                food.setMarkedForRemoval(true);
                System.err.println("Invalid food object detected: id=" + food.getId());
            }
        }
    }

    private boolean isFiniteCell(Cell cell) {
        if (cell.getGenome() == null
                || !Double.isFinite(cell.getX())
                || !Double.isFinite(cell.getY())
                || !Double.isFinite(cell.getVx())
                || !Double.isFinite(cell.getVy())
                || !Double.isFinite(cell.getEnergy())) {
            return false;
        }
        return Double.isFinite(cell.getMass())
                && Double.isFinite(cell.getRadius())
                && cell.getRadius() > 0.0;
    }

    private boolean isFiniteFood(Food food) {
        return Double.isFinite(food.getX())
                && Double.isFinite(food.getY())
                && Double.isFinite(food.getEnergy())
                && Double.isFinite(food.getRadius())
                && food.getRadius() >= 0.0;
    }
}
