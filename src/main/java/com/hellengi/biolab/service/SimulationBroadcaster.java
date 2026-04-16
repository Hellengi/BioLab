package com.hellengi.biolab.service;

import com.hellengi.biolab.dto.WorldStateDto;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.databind.json.JsonMapper;

import java.util.Iterator;

@Component
public class SimulationBroadcaster {

    private final SimulationWebSocketHandler webSocketHandler;
    private final JsonMapper objectMapper;

    public SimulationBroadcaster(
            SimulationWebSocketHandler webSocketHandler,
            JsonMapper objectMapper
    ) {
        this.webSocketHandler = webSocketHandler;
        this.objectMapper = objectMapper;
    }

    public void broadcast(WorldStateDto dto) {
        try {
            String json = objectMapper.writeValueAsString(dto);
            TextMessage message = new TextMessage(json);

            Iterator<WebSocketSession> iterator = webSocketHandler.getSessions().iterator();
            while (iterator.hasNext()) {
                WebSocketSession session = iterator.next();
                try {
                    if (session.isOpen()) {
                        session.sendMessage(message);
                    }
                } catch (Exception e) {
                    try {
                        session.close();
                    } catch (Exception ignored) {
                    }
                    iterator.remove();
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to broadcast world state", e);
        }
    }
}