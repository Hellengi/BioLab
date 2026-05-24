package com.hellengi.biolab.mapper.api;

import com.hellengi.biolab.api.dto.FoodDto;
import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.domain.model.Food;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FoodMapper {
    public final YamlConfig config;

    public FoodDto toDto(Food food) {
        return new FoodDto(
                food.getId(),
                food.getX(),
                food.getY(),
                food.getEnergy(),
                food.getRadius(),
                food.isMarkedForRemoval()
        );
    }

    public Food toDomain(FoodDto dto) {
        Food food = new Food(dto.id(), config);
        food.setPosition(dto.x(), dto.y());
        food.setEnergy(dto.energy());
        food.setMarkedForRemoval(dto.consumed());
        return food;
    }
}