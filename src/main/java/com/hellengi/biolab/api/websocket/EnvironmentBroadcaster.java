package com.hellengi.biolab.api.websocket;

import com.hellengi.biolab.api.dto.EnvironmentDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import tools.jackson.databind.json.JsonMapper;

@Component
@RequiredArgsConstructor
public class EnvironmentBroadcaster {
    private final EnvironmentSocketHandler webSocketHandler;
    private final JsonMapper objectMapper;

    public void broadcast(EnvironmentDto dto) {
        try {
            String json = objectMapper.writeValueAsString(dto);
            TextMessage message = new TextMessage(json);

            webSocketHandler.broadcastToAll(message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to broadcast environment state", e);
        }
    }
}