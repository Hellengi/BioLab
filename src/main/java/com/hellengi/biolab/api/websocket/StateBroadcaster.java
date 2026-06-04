package com.hellengi.biolab.api.websocket;

import com.hellengi.biolab.domain.SimulationEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import tools.jackson.databind.json.JsonMapper;

@Component
@RequiredArgsConstructor
public class StateBroadcaster {
    private static final long SCHEDULER_POLL_INTERVAL_MS = 4L;

    private final SimulationEngine simulationEngine;
    private final SocketHandler socketHandler;
    private final JsonMapper objectMapper;

    @Scheduled(fixedRate = SCHEDULER_POLL_INTERVAL_MS)
    public void simulationTick() {
        if (simulationEngine.poll()) {
            broadcastWorld();
            broadcast(simulationEngine.getMetricsDto());
        }
    }

    private void broadcastWorld() {
        socketHandler.broadcastWorld(displayLayers -> toMessage(simulationEngine.getWorldDto(displayLayers)));
    }

    public void broadcast(Object dto) {
        socketHandler.broadcastToAll(toMessage(dto));
    }

    private TextMessage toMessage(Object dto) {
        try {
            return new TextMessage(objectMapper.writeValueAsString(dto));
        } catch (Exception e) {
            throw new RuntimeException("Failed to broadcast simulation payload", e);
        }
    }
}
