package com.hellengi.biolab.api.websocket;

import com.hellengi.biolab.dto.DisplayLayersDto;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NullMarked;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.databind.json.JsonMapper;

import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

@Component
@NullMarked
@RequiredArgsConstructor
public class SocketHandler extends TextWebSocketHandler {
    private static final String DISPLAY_LAYERS_ATTRIBUTE = "displayLayers";

    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();
    private final JsonMapper objectMapper;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        session.getAttributes().put(DISPLAY_LAYERS_ATTRIBUTE, DisplayLayersDto.off());
        sessions.add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            Map<?, ?> payload = objectMapper.readValue(message.getPayload(), Map.class);
            if (!"displayLayers".equals(payload.get("type"))) {
                return;
            }

            session.getAttributes().put(
                    DISPLAY_LAYERS_ATTRIBUTE,
                    new DisplayLayersDto(
                            Boolean.TRUE.equals(payload.get("opacityMap")),
                            Boolean.TRUE.equals(payload.get("lightDirection")),
                            Boolean.TRUE.equals(payload.get("quadtree")),
                            Boolean.TRUE.equals(payload.get("cellDirections"))
                    )
            );
        } catch (Exception ignored) {
            // UI state messages are optional. Invalid payloads must not close the simulation socket.
        }
    }

    public void broadcastWorld(Function<DisplayLayersDto, TextMessage> messageFactory) {
        Iterator<WebSocketSession> iterator = sessions.iterator();

        while (iterator.hasNext()) {
            WebSocketSession session = iterator.next();

            try {
                if (session.isOpen()) {
                    session.sendMessage(messageFactory.apply(displayLayersOf(session)));
                } else {
                    iterator.remove();
                }
            } catch (Exception e) {
                closeSession(session);
                iterator.remove();
            }
        }
    }

    public void broadcastToAll(TextMessage message) {
        Iterator<WebSocketSession> iterator = sessions.iterator();

        while (iterator.hasNext()) {
            WebSocketSession session = iterator.next();

            try {
                if (session.isOpen()) {
                    session.sendMessage(message);
                } else {
                    iterator.remove();
                }
            } catch (Exception e) {
                closeSession(session);
                iterator.remove();
            }
        }
    }

    private DisplayLayersDto displayLayersOf(WebSocketSession session) {
        Object value = session.getAttributes().get(DISPLAY_LAYERS_ATTRIBUTE);
        return value instanceof DisplayLayersDto displayLayers ? displayLayers : DisplayLayersDto.off();
    }

    private void closeSession(WebSocketSession session) {
        try {
            session.close();
        } catch (Exception ignored) {
        }
    }
}


