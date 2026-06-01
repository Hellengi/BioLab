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
    private static final long SCHEDULER_POLL_INTERVAL_MS = 1L;

    private final SimulationEngine simulationEngine;
    private final SocketHandler socketHandler;
    private final JsonMapper objectMapper;

    @Scheduled(fixedRate = SCHEDULER_POLL_INTERVAL_MS)
    public void simulationTick() {
        if (simulationEngine.poll()) {
            broadcast(simulationEngine.getWorldDto());
            broadcast(simulationEngine.getMetricsDto());
        }
    }

    public void broadcast(Object dto) {
        try {
            String json = objectMapper.writeValueAsString(dto);
            TextMessage message = new TextMessage(json);
            socketHandler.broadcastToAll(message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to broadcast simulation world", e);
        }
    }
}