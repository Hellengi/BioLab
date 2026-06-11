package com.hellengi.biolab.api.websocket;

import com.hellengi.biolab.dto.DisplayLayersDto;
import com.hellengi.biolab.metrics.PerformanceMetricsRegistry;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NullMarked;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@NullMarked
@RequiredArgsConstructor
public class SocketHandler extends TextWebSocketHandler {
    private static final String TYPE_DISPLAY_LAYERS = "displayLayers";
    private static final String TYPE_SUBSCRIBE = "subscribe";
    private static final String TYPE_CLIENT_METRICS = "clientMetrics";

    private final Map<String, SessionChannel> sessions = new ConcurrentHashMap<>();
    private final JsonMapper objectMapper;
    private final PerformanceMetricsRegistry performanceMetrics;
    private final ExecutorService sendExecutor = new ThreadPoolExecutor(
            BroadcastConstants.SEND_EXECUTOR_THREADS,
            BroadcastConstants.SEND_EXECUTOR_THREADS,
            0L,
            TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(BroadcastConstants.SEND_EXECUTOR_QUEUE_CAPACITY),
            new WebSocketThreadFactory(),
            new ThreadPoolExecutor.DiscardOldestPolicy()
    );

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.put(session.getId(), new SessionChannel(session));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        removeSession(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            Map<?, ?> payload = objectMapper.readValue(message.getPayload(), Map.class);
            String type = String.valueOf(payload.get("type"));
            if (TYPE_CLIENT_METRICS.equals(type)) {
                performanceMetrics.recordClientMetrics(session.getId(), payload);
                return;
            }
            if (!TYPE_DISPLAY_LAYERS.equals(type) && !TYPE_SUBSCRIBE.equals(type)) {
                return;
            }

            channelOf(session).ifPresent(channel -> channel.updateSubscription(
                    displayLayersFrom(payload),
                    viewportFrom(payload)
            ));
        } catch (Exception ignored) {
            // UI state messages are optional. Invalid payloads must not close the simulation socket.
        }
    }

    public boolean hasOpenSessions() {
        removeClosedSessions();
        recordSocketGauges();
        return sessions.values().stream().anyMatch(SessionChannel::isOpen);
    }

    public Map<RenderGroupKey, List<SessionChannel>> renderGroups() {
        return openChannels().stream()
                .collect(Collectors.groupingBy(channel -> new RenderGroupKey(
                        channel.displayLayers().renderKey(),
                        channel.viewport().bucketed(BroadcastConstants.VIEWPORT_GROUP_BUCKET_WORLD_UNITS)
                )));
    }

    public Map<DisplayLayersDto, List<SessionChannel>> lightingGroups() {
        return openChannels().stream()
                .collect(Collectors.groupingBy(channel -> channel.displayLayers().lightingKey()));
    }

    public Map<DisplayLayersDto, List<SessionChannel>> selectedCellGroups() {
        Map<DisplayLayersDto, List<SessionChannel>> groups = new HashMap<>();
        for (SessionChannel channel : openChannels()) {
            DisplayLayersDto displayLayers = channel.displayLayers();
            if (!displayLayers.hasSelectedCell()) {
                continue;
            }
            groups.computeIfAbsent(displayLayers.selectedCellKey(), ignored -> new ArrayList<>()).add(channel);
        }
        return groups;
    }

    public void broadcastToAll(WebSocketMessage<?> message) {
        broadcastToAll(BroadcastConstants.LANE_GENERIC, message);
    }

    public void broadcastToAll(String lane, WebSocketMessage<?> message) {
        for (SessionChannel channel : openChannels()) {
            channel.offer(lane, message);
        }
    }

    public <K> void broadcastGrouped(
            String lane,
            Map<K, List<SessionChannel>> groups,
            Function<K, WebSocketMessage<?>> messageFactory
    ) {
        for (Map.Entry<K, List<SessionChannel>> entry : groups.entrySet()) {
            WebSocketMessage<?> message = messageFactory.apply(entry.getKey());
            for (SessionChannel channel : entry.getValue()) {
                channel.offer(lane, message);
            }
        }
    }

    private List<SessionChannel> openChannels() {
        removeClosedSessions();
        recordSocketGauges();
        return sessions.values().stream()
                .filter(SessionChannel::isOpen)
                .toList();
    }

    private void recordSocketGauges() {
        int open = 0;
        int pending = 0;
        int dropped = 0;
        int skipped = 0;
        for (SessionChannel channel : sessions.values()) {
            if (!channel.isOpen()) {
                continue;
            }
            open++;
            pending += channel.pendingByLane.size();
            dropped += channel.droppedFrames.get();
            skipped += channel.skippedSends.get();
        }

        performanceMetrics.setGauge("server.websocket.sessions.open", open);
        performanceMetrics.setGauge("server.websocket.pendingMessages", pending);
        performanceMetrics.setGauge("server.websocket.droppedFrames.current", dropped);
        performanceMetrics.setGauge("server.websocket.skippedSends.current", skipped);
    }

    private Optional<SessionChannel> channelOf(WebSocketSession session) {
        SessionChannel channel = sessions.get(session.getId());
        if (channel != null && channel.isOpen()) {
            return Optional.of(channel);
        }
        return Optional.empty();
    }

    private void removeSession(WebSocketSession session) {
        SessionChannel removed = sessions.remove(session.getId());
        if (removed != null) {
            removed.closeQuietly();
        }
    }

    private void removeClosedSessions() {
        sessions.entrySet().removeIf(entry -> {
            boolean closed = !entry.getValue().isOpen();
            if (closed) {
                entry.getValue().closeQuietly();
            }
            return closed;
        });
    }

    private DisplayLayersDto displayLayersFrom(Map<?, ?> payload) {
        return new DisplayLayersDto(
                Boolean.TRUE.equals(payload.get("opacityMap")),
                Boolean.TRUE.equals(payload.get("directedLightMap")),
                Boolean.TRUE.equals(payload.get("scatteredLightMap")),
                Boolean.TRUE.equals(payload.get("lightDirection")),
                Boolean.TRUE.equals(payload.get("quadtree")),
                Boolean.TRUE.equals(payload.get("cellDirections")),
                selectedCellId(payload.get("selectedCellId")),
                String.valueOf(payload.get("selectedCellMode") == null ? "general" : payload.get("selectedCellMode"))
        ).normalized();
    }

    private ClientViewport viewportFrom(Map<?, ?> payload) {
        Object viewport = payload.get("viewport");
        if (!(viewport instanceof Map<?, ?> viewportMap)) {
            return ClientViewport.FULL_WORLD;
        }

        return new ClientViewport(
                number(viewportMap.get("minX"), Double.NEGATIVE_INFINITY),
                number(viewportMap.get("minY"), Double.NEGATIVE_INFINITY),
                number(viewportMap.get("maxX"), Double.POSITIVE_INFINITY),
                number(viewportMap.get("maxY"), Double.POSITIVE_INFINITY),
                number(viewportMap.get("margin"), BroadcastConstants.VIEWPORT_MARGIN_WORLD_UNITS)
        ).normalized(BroadcastConstants.VIEWPORT_MARGIN_WORLD_UNITS);
    }

    private double number(Object value, double fallback) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Double.parseDouble(text);
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private Long selectedCellId(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Long.parseLong(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    public final class SessionChannel {
        private final WebSocketSession session;
        private final Map<String, WebSocketMessage<?>> pendingByLane = new ConcurrentHashMap<>();
        private final AtomicBoolean sending = new AtomicBoolean(false);
        private final AtomicInteger skippedSends = new AtomicInteger(0);
        private final AtomicInteger droppedFrames = new AtomicInteger(0);
        private volatile DisplayLayersDto displayLayers = DisplayLayersDto.off();
        private volatile ClientViewport viewport = ClientViewport.FULL_WORLD;

        private SessionChannel(WebSocketSession session) {
            this.session = session;
        }

        public DisplayLayersDto displayLayers() {
            return displayLayers;
        }

        public ClientViewport viewport() {
            return viewport;
        }

        public int droppedFrames() {
            return droppedFrames.get();
        }

        private void updateSubscription(DisplayLayersDto displayLayers, ClientViewport viewport) {
            this.displayLayers = displayLayers == null ? DisplayLayersDto.off() : displayLayers.normalized();
            this.viewport = viewport == null ? ClientViewport.FULL_WORLD : viewport.normalized(BroadcastConstants.VIEWPORT_MARGIN_WORLD_UNITS);
        }

        private boolean isOpen() {
            return session.isOpen();
        }

        private void offer(String lane, WebSocketMessage<?> message) {
            if (!isOpen()) {
                closeQuietly();
                return;
            }

            String safeLane = lane == null ? BroadcastConstants.LANE_GENERIC : lane;
            performanceMetrics.recordBytes("server.websocket.offeredBytes", Math.max(0, message.getPayloadLength()));
            performanceMetrics.recordBytes("server.websocket.offeredBytes." + safeLane, Math.max(0, message.getPayloadLength()));

            WebSocketMessage<?> replaced = pendingByLane.put(safeLane, message);
            if (replaced != null) {
                droppedFrames.incrementAndGet();
                performanceMetrics.incrementCounter(PerformanceMetricsRegistry.SERVER_DROPPED_FRAMES);
                performanceMetrics.incrementCounter(PerformanceMetricsRegistry.SERVER_DROPPED_FRAMES + "." + safeLane);
            }
            recordSocketGauges();

            if (!sending.compareAndSet(false, true)) {
                if (skippedSends.incrementAndGet() > BroadcastConstants.MAX_SKIPPED_SENDS_BEFORE_CLOSE) {
                    performanceMetrics.incrementCounter("server.websocket.closed.slowClient");
                    closeQuietly();
                }
                return;
            }

            sendExecutor.execute(this::drainLatest);
        }

        private void drainLatest() {
            try {
                while (isOpen()) {
                    LaneMessage laneMessage = pollNextMessage();
                    if (laneMessage == null) {
                        return;
                    }
                    long sendStartNanos = System.nanoTime();
                    session.sendMessage(laneMessage.message());
                    long sendNanos = System.nanoTime() - sendStartNanos;
                    performanceMetrics.recordDuration(PerformanceMetricsRegistry.SERVER_WEBSOCKET_SEND, sendNanos);
                    performanceMetrics.recordDuration(PerformanceMetricsRegistry.SERVER_WEBSOCKET_SEND + "." + laneMessage.lane(), sendNanos);
                    performanceMetrics.incrementCounter("server.websocket.sent." + laneMessage.lane());
                    performanceMetrics.recordBytes("server.websocket.sentBytes", Math.max(0, laneMessage.message().getPayloadLength()));
                    performanceMetrics.recordBytes("server.websocket.sentBytes." + laneMessage.lane(), Math.max(0, laneMessage.message().getPayloadLength()));
                    skippedSends.set(0);
                    recordSocketGauges();
                }
            } catch (IOException | RuntimeException ignored) {
                closeQuietly();
            } finally {
                sending.set(false);
                if (!pendingByLane.isEmpty() && isOpen() && sending.compareAndSet(false, true)) {
                    sendExecutor.execute(this::drainLatest);
                }
            }
        }

        private LaneMessage pollNextMessage() {
            for (String lane : BroadcastConstants.SEND_LANE_PRIORITY) {
                WebSocketMessage<?> message = pendingByLane.remove(lane);
                if (message != null) {
                    return new LaneMessage(lane, message);
                }
            }
            return null;
        }

        private void closeQuietly() {
            try {
                if (session.isOpen()) {
                    session.close();
                }
            } catch (Exception ignored) {
            }
        }
    }

    private record LaneMessage(String lane, WebSocketMessage<?> message) {
    }

    private static final class WebSocketThreadFactory implements ThreadFactory {
        private final AtomicInteger index = new AtomicInteger();

        @Override
        public Thread newThread(Runnable runnable) {
            Thread thread = new Thread(runnable, "biolab-ws-send-" + index.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        }
    }
}


