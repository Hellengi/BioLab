package com.hellengi.biolab.domain;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Spring scheduler adapter; all simulation orchestration belongs to SimulationEngine. */
@Component
@RequiredArgsConstructor
public class SimulationLoop {
    private static final long SCHEDULER_POLL_INTERVAL_MS = 1L;

    private final SimulationEngine simulationEngine;

    @Scheduled(fixedRate = SCHEDULER_POLL_INTERVAL_MS)
    public void simulationTick() {
        simulationEngine.poll();
    }
}
