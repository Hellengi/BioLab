package com.hellengi.biolab.api.websocket;

import org.jspecify.annotations.NullMarked;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Set;
import java.util.Iterator;
import java.util.concurrent.ConcurrentHashMap;

@Component
@NullMarked
public class EnvironmentSocketHandler extends TextWebSocketHandler {
    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {}

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

    private void closeSession(WebSocketSession session) {
        try {
            session.close();
        } catch (Exception ignored) {
        }
    }
}