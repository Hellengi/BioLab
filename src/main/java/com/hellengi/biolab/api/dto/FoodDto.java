package com.hellengi.biolab.api.dto;

public record FoodDto(
        long id,
        double x,
        double y,
        double energy,
        double radius,
        boolean consumed
) {
}