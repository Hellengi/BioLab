package com.hellengi.biolab.simulation.mapper;

import com.hellengi.biolab.api.dto.FoodDto;
import com.hellengi.biolab.simulation.physics.FoodMetrics;
import com.hellengi.biolab.model.Food;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FoodMapper {
    private final FoodMetrics foodMetrics;

    public FoodDto toDto(Food food) {
        return new FoodDto(
                food.getId(),
                food.getX(),
                food.getY(),
                food.getEnergy(),
                foodMetrics.radius(food.getEnergy()),
                food.isConsumed()
        );
    }

    public Food toFood(FoodDto dto) {
        Food food = new Food(
                dto.id(),
                dto.x(),
                dto.y(),
                dto.energy()
        );

        food.setConsumed(dto.consumed());
        return food;
    }
}