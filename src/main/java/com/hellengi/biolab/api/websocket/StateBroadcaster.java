package com.hellengi.biolab.api.websocket;

import com.hellengi.biolab.api.websocket.protocol.BinaryRenderFrameEncoder;
import com.hellengi.biolab.domain.SimulationEngine;
import com.hellengi.biolab.dto.DisplayLayersDto;
import com.hellengi.biolab.dto.SimulationMetricsDto;
import com.hellengi.biolab.dto.SimulationRenderFrameDto;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class StateBroadcaster {
    private final SimulationEngine simulationEngine;
    private final SocketHandler socketHandler;
    private final JsonMapper objectMapper;
    private final BinaryRenderFrameEncoder binaryRenderFrameEncoder;

    private long lastMetricsBroadcastMs = 0L;
    private long lastLightingBroadcastMs = 0L;
    private long lastCellDetailsBroadcastMs = 0L;
    private long lastKnownTps = 0L;

    @Scheduled(fixedRate = BroadcastConstants.SCHEDULER_POLL_INTERVAL_MS)
    public void simulationTick() {
        if (!simulationEngine.poll()) {
            return;
        }
        if (!socketHandler.hasOpenSessions()) {
            return;
        }

        long nowMs = System.currentTimeMillis();
        boolean shouldBroadcastMetrics = metricsDue(nowMs);
        if (shouldBroadcastMetrics) {
            refreshMeasuredTps();
        }

        broadcastRenderFrames(lastKnownTps);
        broadcastLightingFramesIfDue(nowMs);
        broadcastCellDetailsIfDue(nowMs);
        broadcastMetricsIfDue(nowMs, shouldBroadcastMetrics);
    }

    private void broadcastRenderFrames(long tps) {
        Map<RenderGroupKey, List<SocketHandler.SessionChannel>> groups = socketHandler.renderGroups();
        socketHandler.broadcastGrouped(BroadcastConstants.LANE_RENDER, groups, group -> {
            SimulationRenderFrameDto frame = simulationEngine.getRenderFrameDto(group.displayLayers(), group.viewport(), tps);
            return binaryRenderFrameEncoder.encode(frame);
        });
    }

    private void broadcastLightingFramesIfDue(long nowMs) {
        if (nowMs - lastLightingBroadcastMs < BroadcastConstants.LIGHTING_FRAME_INTERVAL_MS) {
            return;
        }
        lastLightingBroadcastMs = nowMs;

        Map<DisplayLayersDto, List<SocketHandler.SessionChannel>> groups = socketHandler.lightingGroups();
        socketHandler.broadcastGrouped(BroadcastConstants.LANE_LIGHTING, groups, displayLayers -> toTextMessage(simulationEngine.getLightingFrameDto(displayLayers)));
    }

    private void broadcastCellDetailsIfDue(long nowMs) {
        if (nowMs - lastCellDetailsBroadcastMs < BroadcastConstants.CELL_DETAILS_INTERVAL_MS) {
            return;
        }
        lastCellDetailsBroadcastMs = nowMs;

        Map<DisplayLayersDto, List<SocketHandler.SessionChannel>> groups = socketHandler.selectedCellGroups();
        socketHandler.broadcastGrouped(BroadcastConstants.LANE_DETAILS, groups, displayLayers -> toTextMessage(simulationEngine.getCellDetailsDto(displayLayers)));
    }

    private void broadcastMetricsIfDue(long nowMs, boolean shouldBroadcastMetrics) {
        if (!shouldBroadcastMetrics) {
            return;
        }
        lastMetricsBroadcastMs = nowMs;
        socketHandler.broadcastToAll(BroadcastConstants.LANE_METRICS, toTextMessage(new SimulationMetricsDto(lastKnownTps)));
    }

    private boolean metricsDue(long nowMs) {
        return nowMs - lastMetricsBroadcastMs >= BroadcastConstants.METRICS_INTERVAL_MS;
    }

    private void refreshMeasuredTps() {
        lastKnownTps = simulationEngine.getMetricsDto().tps();
    }

    public void broadcast(Object dto) {
        if (socketHandler.hasOpenSessions()) {
            socketHandler.broadcastToAll(toTextMessage(dto));
        }
    }

    private WebSocketMessage<?> toTextMessage(Object dto) {
        try {
            String payload = objectMapper.writeValueAsString(dto);
            return new TextMessage(payload);
        } catch (Exception e) {
            throw new RuntimeException("Failed to broadcast simulation payload", e);
        }
    }
}
