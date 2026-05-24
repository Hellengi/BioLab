package com.hellengi.biolab.api.websocket;

import com.hellengi.biolab.api.dto.SimulationWorldDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import tools.jackson.databind.json.JsonMapper;

@Component
@RequiredArgsConstructor
public class SimulationWorldBroadcaster {
    private final SimulationSocketHandler simulationSocketHandler;
    private final JsonMapper objectMapper;

    public void broadcast(SimulationWorldDto dto) {
        try {
            String json = objectMapper.writeValueAsString(dto);
            TextMessage message = new TextMessage(json);

            simulationSocketHandler.broadcastToAll(message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to broadcast simulation state", e);
        }
    }
}