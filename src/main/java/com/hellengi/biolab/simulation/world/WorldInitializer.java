package com.hellengi.biolab.simulation.world;

import com.hellengi.biolab.config.YamlConfig;
import com.hellengi.biolab.simulation.factory.SpawnFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorldInitializer {
    private final YamlConfig baseConfig;
    private final SpawnFactory spawnFactory;

    public void initialize(WorldState world, int initialCellCount) {
        world.setRunning(false);
        world.setTick(0L);
        world.clear();

        for (int i = 0; i < initialCellCount; i++) {
            world.getCells().add(
                    spawnFactory.createRandomCell(
                            baseConfig.getSpawn().getCenterX(),
                            baseConfig.getSpawn().getCenterY()
                    )
            );
        }

        for (int i = 0; i < baseConfig.getFood().getInitialCount(); i++) {
            world.getFoods().add(spawnFactory.createRandomFood());
        }

        world.setLastSimulationStepTimeNs(System.nanoTime());
    }
}