package com.hellengi.biolab.domain.lifecycle;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.SimulationWorld;
import com.hellengi.biolab.domain.model.Cell;
import com.hellengi.biolab.domain.model.Food;
import com.hellengi.biolab.domain.model.LysosomeSlot;
import com.hellengi.biolab.domain.spatial.SpatialHashGrid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import static com.hellengi.biolab.util.Utils.EPSILON;
import static com.hellengi.biolab.util.Utils.clamp01;
import static com.hellengi.biolab.util.Utils.smoothstep;

@Component
@RequiredArgsConstructor
public class FoodDigestion {
    private static final double CAPTURE_ENERGY_DEFICIT_THRESHOLD = 0.02;
    private static final double LYSOSOME_TARGET_EPSILON_FACTOR = 0.006;
    private static final double RELEASE_OFFSET = 0.75;
    private static final double MIN_SATURATION_DIGESTION_FACTOR = 0.06;

    private final YamlConfig config;
    private final List<Food> nearbyFoods = new ArrayList<>();
    private final List<Food> touchedFoods = new ArrayList<>();

    public void process(SimulationWorld world, Cell cell, SpatialHashGrid<Food> foodIndex, Map<Long, Food> foodById, double tickScale) {
        if (cell.getGenome() == null || !cell.isAlive() || tickScale <= 0.0) {
            cell.rememberDigestion(0.0, 0.0, 0.0);
            return;
        }

        cell.resetLysosomeSlotRates();
        releaseInvalidCapturedFood(cell, foodById, true);

        if (cell.getLysosomeCapacity() <= 0) {
            cell.rememberDigestion(0.0, 0.0, 0.0);
            return;
        }

        if (canCaptureNewFood(cell)) {
            captureTouchedFood(cell, foodIndex);
        }

        cell.updateInternalLayout(tickScale);
        DigestionResult result = updateCapturedFood(cell, foodById, tickScale);
        cell.rememberDigestion(
                result.grossEnergyGain() / tickScale,
                result.energyCost() / tickScale,
                0.0
        );
    }

    public void releaseCapturedFood(SimulationWorld world, Cell cell, boolean pushOutside) {
        for (Food food : world.getFoods()) {
            if (!food.isCapturedBy(cell.getId())) continue;
            releaseFood(cell, food, pushOutside);
        }
        for (LysosomeSlot slot : cell.getLysosomeSlots()) {
            slot.clearFood();
        }
        cell.updateInternalLayout(1.0);
    }

    public void releaseOrphanedCapturedFood(SimulationWorld world, Map<Long, Cell> cellById) {
        for (Food food : world.getFoods()) {
            if (!food.isCaptured()) continue;
            Cell owner = food.getCapturedByCellId() == null ? null : cellById.get(food.getCapturedByCellId());
            if (owner == null) {
                food.release();
                continue;
            }
            if (owner.isMarkedForRemoval() || !owner.isAlive()) {
                releaseFood(owner, food, true);
                continue;
            }
            LysosomeSlot slot = owner.getLysosomeSlot(food.getDigestionSlotIndex());
            if (slot == null || slot.getFoodId() == null || !slot.getFoodId().equals(food.getId())) {
                int freeSlotIndex = owner.getFreeLysosomeSlotIndex();
                if (freeSlotIndex >= 0) {
                    LysosomeSlot newSlot = owner.getLysosomeSlot(freeSlotIndex);
                    newSlot.occupy(food.getId());
                    food.capture(owner.getId(), freeSlotIndex);
                    food.rememberCapturedCellPosition(owner.getX(), owner.getY());
                    newSlot.syncFood(food);
                    owner.updateInternalLayout(1.0);
                } else {
                    releaseFood(owner, food, true);
                }
            }
        }
    }

    public void transferCapturedFoodOnDivision(SimulationWorld world, Cell parent, List<Cell> children) {
        if (children == null || children.isEmpty()) {
            releaseCapturedFood(world, parent, true);
            return;
        }

        for (LysosomeSlot parentSlot : parent.getLysosomeSlots()) {
            Cell target = chooseChildForSlot(parent, parentSlot, children);
            if (target == null) {
                releaseParentSlotFood(world, parent, parentSlot);
                continue;
            }

            int childSlotIndex = target.getFreeLysosomeSlotIndex();
            if (childSlotIndex < 0) {
                releaseParentSlotFood(world, parent, parentSlot);
                continue;
            }

            LysosomeSlot childSlot = target.getLysosomeSlot(childSlotIndex);
            childSlot.setDamage(com.hellengi.biolab.domain.model.DamageModel.inheritedDamage(parentSlot.getDamage(), config.getCell()));

            Food food = findFood(world, parentSlot.getFoodId());
            if (food != null && food.isCapturedBy(parent.getId())) {
                childSlot.occupy(food.getId());
                food.capture(target.getId(), childSlotIndex);
                food.rememberCapturedCellPosition(target.getX(), target.getY());
                food.setInsideLysosome(false);
                childSlot.syncFood(food);
                target.updateInternalLayout(1.0);
            }
            parentSlot.clearFood();
        }
    }

    private boolean canCaptureNewFood(Cell cell) {
        if (!cell.hasFreeLysosomeSlot()) return false;
        double maxEnergy = Math.max(cell.getMaxEnergy(), EPSILON);
        double energyDeficit01 = (maxEnergy - cell.getEnergy()) / maxEnergy;
        return energyDeficit01 > CAPTURE_ENERGY_DEFICIT_THRESHOLD;
    }

    private void captureTouchedFood(Cell cell, SpatialHashGrid<Food> foodIndex) {
        double maxFoodRadius = config.getFood().getBaseRadius()
                * Math.sqrt(Math.max(0.0, config.getFood().getMaxEnergy()) / Math.max(0.1, config.getFood().getMinEnergy()));
        double queryRadius = cell.getRadius() + maxFoodRadius;
        nearbyFoods.clear();
        touchedFoods.clear();
        foodIndex.queryCircle(cell.getX(), cell.getY(), queryRadius, nearbyFoods);

        for (Food food : nearbyFoods) {
            if (food.isMarkedForRemoval() || food.isCaptured() || !touches(cell, food)) {
                continue;
            }
            touchedFoods.add(food);
        }
        touchedFoods.sort(Comparator.comparingDouble(food -> distanceSq(cell.getX(), cell.getY(), food.getX(), food.getY())));

        for (Food food : touchedFoods) {
            int slotIndex = cell.getFreeLysosomeSlotIndex();
            if (slotIndex < 0) break;
            LysosomeSlot slot = cell.getLysosomeSlot(slotIndex);
            if (slot == null) continue;
            slot.occupy(food.getId());
            food.capture(cell.getId(), slotIndex);
            food.rememberCapturedCellPosition(cell.getX(), cell.getY());
            slot.syncFood(food);
            slot.setTargetFoodRadius(food.getRadius());
        }
        nearbyFoods.clear();
        touchedFoods.clear();
    }

    private DigestionResult updateCapturedFood(Cell cell, Map<Long, Food> foodById, double tickScale) {
        double grossEnergyGain = 0.0;
        double energyCost = 0.0;
        for (LysosomeSlot slot : cell.getLysosomeSlots()) {
            Food food = findFood(foodById, slot.getFoodId());
            if (food == null || food.isMarkedForRemoval() || !food.isCapturedBy(cell.getId())) {
                slot.clearFood();
                continue;
            }

            food.translateWithCapturedCell(cell.getX(), cell.getY());
            slot.syncFood(food);


            if (!food.isInsideLysosome()) {
                moveFoodToLysosome(cell, food, slot, tickScale);
                slot.syncFood(food);
                continue;
            }


            DigestionResult result = digestInsideLysosome(cell, food, slot, tickScale);
            grossEnergyGain += result.grossEnergyGain();
            energyCost += result.energyCost();


            if (food.getEnergy() <= EPSILON) {
                food.setMarkedForRemoval(true);
                slot.clearFood();
            } else {
                slot.syncFood(food);
            }
        }

        return new DigestionResult(grossEnergyGain, energyCost);
    }

    private DigestionResult digestInsideLysosome(Cell cell, Food food, LysosomeSlot slot, double tickScale) {
        YamlConfig.CellProperties c = config.getCell();
        double enzyme = cell.getLysosomeEnzymeActivity01();
        double performance = slot.performance();
        double saturation = smoothEnergyDeficitFactor(cell);

        // Once food is inside, it is contained by the assigned lysosome. Keep it
        // exactly at that lysosome target so the backend position matches both
        // simulation and preview rendering while the cell moves or changes radius.
        food.setPosition(cell.getLysosomeTargetX(slot.getIndex()), cell.getLysosomeTargetY(slot.getIndex()));
        food.rememberCapturedCellPosition(cell.getX(), cell.getY());
        food.setInsideLysosome(true);

        double activityFactor = 0.55 + 2.65 * Math.pow(Math.max(0.0, enzyme), 1.12);
        double digestionRate = c.getLysosomeDigestRateFactor()
                * activityFactor
                * performance
                * saturation;

        double digestedEnergy = Math.min(food.getEnergy(), digestionRate * tickScale);
        if (digestedEnergy <= 0.0) {
            slot.syncFood(food);
            slot.rememberDigestionRates(0.0, 0.0, 0.0);
            return new DigestionResult(0.0, 0.0);
        }

        // Food energy itself is transferred with 100% gross efficiency.
        // Lysosome damage lowers digestion speed above through performance;
        // energy loss is represented only by the separate digestion cost.
        double grossYield = Math.min(1.0, Math.max(0.0, c.getLysosomeBaseDigestYield()));
        double grossEnergyGain = digestedEnergy * grossYield;
        double digestionCost = c.getLysosomeDigestCostFactor()
                * digestedEnergy
                * (0.35 + 1.65 * enzyme * enzyme);

        cell.setEnergy(clamp(cell.getEnergy() + grossEnergyGain - digestionCost, 0.0, cell.getMaxEnergy()));
        food.setEnergy(Math.max(0.0, food.getEnergy() - digestedEnergy));

        slot.rememberDigestionRates(grossEnergyGain / tickScale, digestionCost / tickScale, 0.0);
        slot.syncFood(food);

        return new DigestionResult(grossEnergyGain, digestionCost);
    }

    private void moveFoodToLysosome(Cell cell, Food food, LysosomeSlot slot, double tickScale) {
        double targetX = cell.getLysosomeTargetX(slot.getIndex());
        double targetY = cell.getLysosomeTargetY(slot.getIndex());
        double dx = targetX - food.getX();
        double dy = targetY - food.getY();
        double distance = Math.sqrt(dx * dx + dy * dy);
        double threshold = Math.max(0.08, cell.getRadius() * LYSOSOME_TARGET_EPSILON_FACTOR);

        if (distance <= threshold) {
            food.setPosition(targetX, targetY);
            food.setInsideLysosome(true);
            food.rememberCapturedCellPosition(cell.getX(), cell.getY());
            slot.syncFood(food);
            return;
        }

        double speed = Math.max(0.01, cell.getRadius() * config.getCell().getLysosomeTransportSpeedFactor());
        double step = Math.min(distance, speed * tickScale);
        food.setPosition(food.getX() + dx / distance * step, food.getY() + dy / distance * step);
        food.rememberCapturedCellPosition(cell.getX(), cell.getY());
        slot.syncFood(food);
    }

    private void releaseInvalidCapturedFood(Cell cell, Map<Long, Food> foodById, boolean pushOutside) {
        for (LysosomeSlot slot : cell.getLysosomeSlots()) {
            Long foodId = slot.getFoodId();
            if (foodId == null) {
                continue;
            }
            Food food = findFood(foodById, foodId);
            if (food != null && food.isMarkedForRemoval()) {
                slot.clearFood();
                continue;
            }
            if (!cell.hasLysosomes() || food == null || !food.isCapturedBy(cell.getId())) {
                if (food != null && food.isCapturedBy(cell.getId())) {
                    releaseFood(cell, food, pushOutside);
                }
                slot.clearFood();
            } else {
                slot.syncFood(food);
            }
        }
    }

    private void releaseParentSlotFood(SimulationWorld world, Cell parent, LysosomeSlot parentSlot) {
        Food food = findFood(world, parentSlot.getFoodId());
        if (food != null && food.isCapturedBy(parent.getId())) {
            releaseFood(parent, food, true);
        }
        parentSlot.clearFood();
    }

    private void releaseSlotFood(Cell cell, Food food, LysosomeSlot slot) {
        releaseFood(cell, food, true);
        slot.clearFood();
    }


    private void releaseFood(Cell cell, Food food, boolean pushOutside) {
        if (pushOutside) {
            double releaseDistance = cell.getRadius() + food.getRadius() + RELEASE_OFFSET;
            double[] direction = releaseDirection(cell, food, releaseDistance);
            food.setPosition(
                    cell.getX() + direction[0] * releaseDistance,
                    cell.getY() + direction[1] * releaseDistance
            );
        }
        food.release();
    }

    private double[] releaseDirection(Cell cell, Food food, double releaseDistance) {
        double dx = food.getX() - cell.getX();
        double dy = food.getY() - cell.getY();
        double distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= EPSILON) {
            double angle = Math.toRadians(cell.getDirectionAngle() - 90.0);
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            distance = 1.0;
        }

        double nx = dx / distance;
        double ny = dy / distance;
        if (releaseCandidateFitsWorld(cell, food, nx, ny, releaseDistance)) {
            return new double[]{nx, ny};
        }

        double inwardX = config.worldCenterX() - cell.getX();
        double inwardY = config.worldCenterY() - cell.getY();
        double inwardDistance = Math.sqrt(inwardX * inwardX + inwardY * inwardY);
        if (inwardDistance > EPSILON) {
            double ix = inwardX / inwardDistance;
            double iy = inwardY / inwardDistance;
            if (releaseCandidateFitsWorld(cell, food, ix, iy, releaseDistance)) {
                return new double[]{ix, iy};
            }
        }

        double baseAngle = Math.atan2(ny, nx);
        for (int i = 1; i <= 16; i++) {
            double delta = Math.PI * i / 16.0;
            double angle = baseAngle + delta;
            double rx = Math.cos(angle);
            double ry = Math.sin(angle);
            if (releaseCandidateFitsWorld(cell, food, rx, ry, releaseDistance)) {
                return new double[]{rx, ry};
            }

            angle = baseAngle - delta;
            rx = Math.cos(angle);
            ry = Math.sin(angle);
            if (releaseCandidateFitsWorld(cell, food, rx, ry, releaseDistance)) {
                return new double[]{rx, ry};
            }
        }

        return new double[]{nx, ny};
    }

    private boolean releaseCandidateFitsWorld(Cell cell, Food food, double nx, double ny, double releaseDistance) {
        double x = cell.getX() + nx * releaseDistance;
        double y = cell.getY() + ny * releaseDistance;
        double dx = x - config.worldCenterX();
        double dy = y - config.worldCenterY();
        return Math.sqrt(dx * dx + dy * dy) + food.getRadius() <= config.worldRadius();
    }

    private Cell chooseChildForSlot(Cell parent, LysosomeSlot parentSlot, List<Cell> children) {
        double sourceX = parent.getLysosomeTargetX(parentSlot.getIndex());
        double sourceY = parent.getLysosomeTargetY(parentSlot.getIndex());
        Cell best = null;
        double bestScore = Double.POSITIVE_INFINITY;

        for (Cell child : children) {
            int freeSlot = child.getFreeLysosomeSlotIndex();
            if (freeSlot < 0) continue;
            double targetX = child.getLysosomeTargetX(freeSlot);
            double targetY = child.getLysosomeTargetY(freeSlot);
            double score = distanceSq(sourceX, sourceY, targetX, targetY)
                    + child.getOccupiedLysosomeSlots() * 100.0;
            if (score < bestScore) {
                bestScore = score;
                best = child;
            }
        }

        return best;
    }

    private boolean touches(Cell cell, Food food) {
        double radius = cell.getRadius() + food.getRadius();
        return distanceSq(cell.getX(), cell.getY(), food.getX(), food.getY()) <= radius * radius;
    }


    private Food findFood(Map<Long, Food> foodById, Long id) {
        return id == null ? null : foodById.get(id);
    }

    private Food findFood(SimulationWorld world, Long id) {
        if (id == null) return null;
        for (Food food : world.getFoods()) {
            if (food.getId() == id) return food;
        }
        return null;
    }

    private double smoothEnergyDeficitFactor(Cell cell) {
        double maxEnergy = Math.max(cell.getMaxEnergy(), EPSILON);
        double deficit01 = clamp01((maxEnergy - cell.getEnergy()) / maxEnergy);
        return MIN_SATURATION_DIGESTION_FACTOR + (1.0 - MIN_SATURATION_DIGESTION_FACTOR) * smoothstep(deficit01 / 0.25);
    }


    private double clamp(double value, double min, double max) {
        if (!Double.isFinite(value)) return min;
        return Math.max(min, Math.min(max, value));
    }

    private double distanceSq(double x1, double y1, double x2, double y2) {
        double dx = x1 - x2;
        double dy = y1 - y2;
        return dx * dx + dy * dy;
    }

    private record DigestionResult(double grossEnergyGain, double energyCost) {
    }
}
