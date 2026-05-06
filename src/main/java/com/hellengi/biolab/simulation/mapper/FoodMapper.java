package com.hellengi.biolab.simulation.mapper;

import com.hellengi.biolab.api.dto.FoodDto;
import com.hellengi.biolab.api.presentation.RenderMetrics;
import com.hellengi.biolab.model.Food;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FoodMapper {
    private final RenderMetrics renderMetrics;

    public FoodDto toDto(Food food) {
        return new FoodDto(
                food.getId(),
                food.getX(),
                food.getY(),
                food.getEnergy(),
                renderMetrics.calculateFoodRadius(food.getEnergy()),
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