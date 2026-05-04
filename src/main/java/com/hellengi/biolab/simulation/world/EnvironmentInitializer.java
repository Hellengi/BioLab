package com.hellengi.biolab.simulation.world;

import com.hellengi.biolab.config.SimulationProperties;
import com.hellengi.biolab.simulation.factory.EntityFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EnvironmentInitializer {
    private final SimulationProperties baseConfig;
    private final EntityFactory entityFactory;

    public void initialize(SimulationEnvironment world, int initialCellCount) {
        world.setRunning(false);
        world.setTick(0L);
        world.clear();

        for (int i = 0; i < initialCellCount; i++) {
            world.getCells().add(
                    entityFactory.createRandomCell(
                            baseConfig.getSpawn().getCenterX(),
                            baseConfig.getSpawn().getCenterY()
                    )
            );
        }

        for (int i = 0; i < baseConfig.getFood().getInitialCount(); i++) {
            world.getFoods().add(entityFactory.createRandomFood());
        }

        world.setLastSimulationStepTimeMs(System.currentTimeMillis());
    }
}