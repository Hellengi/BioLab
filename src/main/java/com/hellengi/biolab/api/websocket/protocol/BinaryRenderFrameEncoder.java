package com.hellengi.biolab.api.websocket.protocol;

import com.hellengi.biolab.dto.CellRenderDto;
import com.hellengi.biolab.dto.CellVisualDto;
import com.hellengi.biolab.dto.FlagellumSlotRenderDto;
import com.hellengi.biolab.dto.FoodDto;
import com.hellengi.biolab.dto.LightSourceDto;
import com.hellengi.biolab.dto.LightingDto;
import com.hellengi.biolab.dto.LysosomeSlotRenderDto;
import com.hellengi.biolab.dto.RgbColorDto;
import com.hellengi.biolab.dto.SimulationRenderFrameDto;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.util.List;

import static com.hellengi.biolab.api.websocket.protocol.BinaryRenderProtocol.*;

/**
 * Binary render encoder for the hot WebSocket lane. The protocol intentionally
 * keeps the current visual model intact: the browser reconstructs the same
 * render cell objects it used to receive as JSON, but stores visual numbers as
 * Float32 values to halve the hot-lane payload without affecting simulation.
 */
@Component
public class BinaryRenderFrameEncoder {
    public BinaryMessage encode(SimulationRenderFrameDto frame) {
        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream(estimateSize(frame));
            DataOutputStream out = new DataOutputStream(bytes);

            out.writeInt(MAGIC);
            out.writeShort(VERSION);
            out.writeByte(MESSAGE_RENDER_FRAME);
            out.writeLong(frame.tick());
            writeFloat(out, frame.time());
            writeFloat(out, frame.foodSpawnProgress());
            out.writeInt(frame.tubeDiameter());
            out.writeLong(frame.tps() == null ? NULL_LONG : frame.tps());

            writeLightingMetadata(out, frame.lighting());
            writeCells(out, frame.cells());
            writeFoods(out, frame.foods());

            out.flush();
            return new BinaryMessage(bytes.toByteArray());
        } catch (IOException e) {
            throw new IllegalStateException("Failed to encode binary render frame", e);
        }
    }

    private int estimateSize(SimulationRenderFrameDto frame) {
        int cells = frame.cells() == null ? 0 : frame.cells().size();
        int foods = frame.foods() == null ? 0 : frame.foods().size();
        return 96 + cells * 320 + foods * 64;
    }

    private void writeLightingMetadata(DataOutputStream out, LightingDto lighting) throws IOException {
        if (lighting == null) {
            writeFloat(out, 0.0);
            writeFloat(out, 0.0);
            out.writeInt(0);
            out.writeInt(1);
            out.writeInt(0);
            out.writeInt(0);
            return;
        }

        writeFloat(out, lighting.globalLight());
        writeFloat(out, lighting.cycleTick());

        List<LightSourceDto> sources = safeList(lighting.sources());
        out.writeInt(sources.size());
        for (LightSourceDto source : sources) {
            writeFloat(out, source.x());
            writeFloat(out, source.y());
            writeFloat(out, source.brightness());
            writeFloat(out, source.orbitRadius());
            writeFloat(out, source.orbitSpeed());
            writeFloat(out, source.angle());
            out.writeByte("EDGE".equalsIgnoreCase(source.renderType()) ? LIGHT_SOURCE_EDGE : LIGHT_SOURCE_POINT);
        }

        out.writeInt(lighting.gridStep());
        out.writeInt(lighting.gridWidth());
        out.writeInt(lighting.gridHeight());
    }

    private void writeCells(DataOutputStream out, List<CellRenderDto> cells) throws IOException {
        List<CellRenderDto> safeCells = safeList(cells);
        out.writeInt(safeCells.size());
        for (CellRenderDto cell : safeCells) {
            out.writeLong(cell.id());
            writeFloat(out, cell.x());
            writeFloat(out, cell.y());
            writeFloat(out, cell.vx());
            writeFloat(out, cell.vy());
            writeFloat(out, cell.angularVelocity());
            writeFloat(out, cell.energy());
            writeNullableDouble(out, cell.maxEnergy());
            writeFloat(out, cell.radius());
            writeFloat(out, cell.nucleusOffsetX());
            writeFloat(out, cell.nucleusOffsetY());
            writeFloat(out, cell.nucleusRadius());
            writeFloat(out, cell.nucleusTargetOffsetX());
            writeFloat(out, cell.nucleusTargetOffsetY());
            out.writeByte(cell.dead() ? FLAG_DEAD : 0);
            out.writeLong(cell.lifetimeTicks());
            writeFloat(out, cell.localLight());
            writeFloat(out, cell.mass());
            writeNullableDouble(out, cell.dryMass());
            writeFloat(out, cell.density());
            writeNullableDouble(out, cell.opacity());
            writeFloat(out, cell.nucleusDamage());
            writeFloat(out, cell.cellDamage());
            writeFloat(out, cell.cpDamage());
            writeFloat(out, cell.membraneDamage());
            writeFloat(out, cell.lysosomeDamage());
            writeFloat(out, cell.flagellumDamage());
            writeFloat(out, cell.membraneLightTransmittance());
            out.writeInt(cell.lysosomeCapacity());
            out.writeInt(cell.lysosomeOccupiedSlots());
            writeLysosomeSlots(out, cell.lysosomeSlots());
            out.writeInt(cell.flagellumCapacity());
            writeFlagellumSlots(out, cell.flagellumSlots());
            writeVisual(out, cell.visual());
            writeFloat(out, cell.directionAngle());
        }
    }

    private void writeLysosomeSlots(DataOutputStream out, List<LysosomeSlotRenderDto> slots) throws IOException {
        List<LysosomeSlotRenderDto> safeSlots = safeList(slots);
        out.writeInt(safeSlots.size());
        for (LysosomeSlotRenderDto slot : safeSlots) {
            out.writeInt(slot.index());
            writeNullableLong(out, slot.foodId());
            writeFloat(out, slot.damage());
            out.writeBoolean(slot.occupied());
            writeFloat(out, slot.performance());
            writeFloat(out, slot.foodEnergy());
            writeFloat(out, slot.foodRadius());
            out.writeBoolean(slot.foodInsideLysosome());
            writeFloat(out, slot.targetFoodRadius());
            writeFloat(out, slot.layoutX());
            writeFloat(out, slot.layoutY());
            writeFloat(out, slot.layoutRadius());
            writeFloat(out, slot.layoutRotation());
            writeFloat(out, slot.targetLayoutX());
            writeFloat(out, slot.targetLayoutY());
            writeFloat(out, slot.targetLayoutRadius());
            writeFloat(out, slot.targetLayoutRotation());
        }
    }

    private void writeFlagellumSlots(DataOutputStream out, List<FlagellumSlotRenderDto> slots) throws IOException {
        List<FlagellumSlotRenderDto> safeSlots = safeList(slots);
        out.writeInt(safeSlots.size());
        for (FlagellumSlotRenderDto slot : safeSlots) {
            out.writeInt(slot.index());
            writeFloat(out, slot.motorPower());
            writeFloat(out, slot.damage());
            writeFloat(out, slot.performance());
            writeFloat(out, slot.baseX());
            writeFloat(out, slot.baseY());
            writeFloat(out, slot.directionX());
            writeFloat(out, slot.directionY());
            writeFloat(out, slot.length());
            writeFloat(out, slot.thickness());
            writeFloat(out, slot.force());
        }
    }

    private void writeVisual(DataOutputStream out, CellVisualDto visual) throws IOException {
        if (visual == null) {
            visual = emptyVisual();
        }
        writeColor(out, visual.cellColor());
        writeColor(out, visual.membraneColor());
        writeColor(out, visual.nucleoidColor());
        writeColor(out, visual.cytosolColor());
        writeColor(out, visual.chloroplastColor());
        out.writeInt(visual.chloroplastAmount());
        writeColor(out, visual.lysosomeColor());
        out.writeInt(visual.lysosomeAmount());
        writeColor(out, visual.lysosomeGlowColor());
        writeFloat(out, visual.lysosomeGlowStrength());
        writeColor(out, visual.flagellumColor());
        out.writeInt(visual.flagellumCount());
        writeColor(out, visual.bioluminescenceColor());
        writeFloat(out, visual.bioluminescenceExpression());
        writeNullableDouble(out, visual.lightDirectionAngle());
        writeNullableDouble(out, visual.lightGradient());
        writeNullableDouble(out, visual.highlightDirectionAngle());
        writeNullableDouble(out, visual.highlightStrength());
        writeNullableDouble(out, visual.highlightClarity());
    }

    private void writeFoods(DataOutputStream out, List<FoodDto> foods) throws IOException {
        List<FoodDto> safeFoods = safeList(foods);
        out.writeInt(safeFoods.size());
        for (FoodDto food : safeFoods) {
            out.writeLong(food.id());
            writeFloat(out, food.x());
            writeFloat(out, food.y());
            writeFloat(out, food.energy());
            writeFloat(out, food.radius());
            byte flags = 0;
            if (food.consumed()) flags |= FLAG_FOOD_CONSUMED;
            if (food.insideLysosome()) flags |= FLAG_FOOD_INSIDE_LYSOSOME;
            out.writeByte(flags);
            writeNullableLong(out, food.capturedByCellId());
            out.writeInt(food.digestionSlotIndex());
            writeNullableDouble(out, food.capturedCellAnchorX());
            writeNullableDouble(out, food.capturedCellAnchorY());
        }
    }

    private void writeColor(DataOutputStream out, RgbColorDto color) throws IOException {
        RgbColorDto safe = color == null ? new RgbColorDto(0, 0, 0, 0.0) : color;
        out.writeByte(clampByte(safe.r()));
        out.writeByte(clampByte(safe.g()));
        out.writeByte(clampByte(safe.b()));
        writeFloat(out, safe.opacity());
    }

    private int clampByte(int value) {
        return Math.max(0, Math.min(255, value));
    }

    private void writeNullableLong(DataOutputStream out, Long value) throws IOException {
        out.writeLong(value == null ? NULL_LONG : value);
    }

    private void writeNullableDouble(DataOutputStream out, Double value) throws IOException {
        writeFloat(out, value == null ? NULL_DOUBLE : value);
    }

    private void writeFloat(DataOutputStream out, double value) throws IOException {
        out.writeFloat((float) value);
    }

    private CellVisualDto emptyVisual() {
        RgbColorDto transparent = new RgbColorDto(0, 0, 0, 0.0);
        return new CellVisualDto(
                transparent, transparent, transparent, transparent, transparent, 0,
                transparent, 0, transparent, 0.0, transparent, 0,
                transparent, 0.0, null, null, null, null, null
        );
    }

    private <T> List<T> safeList(List<T> list) {
        return list == null ? List.of() : list;
    }
}
