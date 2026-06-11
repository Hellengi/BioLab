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
 * keeps the current visual model lossless: the browser reconstructs the same
 * render cell objects it used to receive as JSON, but without JSON.parse and
 * without textual field names for every entity.
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
            out.writeDouble(frame.time());
            out.writeDouble(frame.foodSpawnProgress());
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
        return 128 + cells * 520 + foods * 96;
    }

    private void writeLightingMetadata(DataOutputStream out, LightingDto lighting) throws IOException {
        if (lighting == null) {
            out.writeDouble(0.0);
            out.writeDouble(0.0);
            out.writeInt(0);
            out.writeInt(1);
            out.writeInt(0);
            out.writeInt(0);
            return;
        }

        out.writeDouble(lighting.globalLight());
        out.writeDouble(lighting.cycleTick());

        List<LightSourceDto> sources = safeList(lighting.sources());
        out.writeInt(sources.size());
        for (LightSourceDto source : sources) {
            out.writeDouble(source.x());
            out.writeDouble(source.y());
            out.writeDouble(source.brightness());
            out.writeDouble(source.orbitRadius());
            out.writeDouble(source.orbitSpeed());
            out.writeDouble(source.angle());
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
            out.writeDouble(cell.x());
            out.writeDouble(cell.y());
            out.writeDouble(cell.vx());
            out.writeDouble(cell.vy());
            out.writeDouble(cell.angularVelocity());
            out.writeDouble(cell.energy());
            writeNullableDouble(out, cell.maxEnergy());
            out.writeDouble(cell.radius());
            out.writeDouble(cell.nucleusOffsetX());
            out.writeDouble(cell.nucleusOffsetY());
            out.writeDouble(cell.nucleusRadius());
            out.writeDouble(cell.nucleusTargetOffsetX());
            out.writeDouble(cell.nucleusTargetOffsetY());
            out.writeByte(cell.dead() ? FLAG_DEAD : 0);
            out.writeLong(cell.lifetimeTicks());
            out.writeDouble(cell.localLight());
            out.writeDouble(cell.mass());
            writeNullableDouble(out, cell.dryMass());
            out.writeDouble(cell.density());
            writeNullableDouble(out, cell.opacity());
            out.writeDouble(cell.nucleusDamage());
            out.writeDouble(cell.cellDamage());
            out.writeDouble(cell.cpDamage());
            out.writeDouble(cell.membraneDamage());
            out.writeDouble(cell.lysosomeDamage());
            out.writeDouble(cell.flagellumDamage());
            out.writeDouble(cell.membraneLightTransmittance());
            out.writeInt(cell.lysosomeCapacity());
            out.writeInt(cell.lysosomeOccupiedSlots());
            writeLysosomeSlots(out, cell.lysosomeSlots());
            out.writeInt(cell.flagellumCapacity());
            writeFlagellumSlots(out, cell.flagellumSlots());
            writeVisual(out, cell.visual());
            out.writeDouble(cell.directionAngle());
        }
    }

    private void writeLysosomeSlots(DataOutputStream out, List<LysosomeSlotRenderDto> slots) throws IOException {
        List<LysosomeSlotRenderDto> safeSlots = safeList(slots);
        out.writeInt(safeSlots.size());
        for (LysosomeSlotRenderDto slot : safeSlots) {
            out.writeInt(slot.index());
            writeNullableLong(out, slot.foodId());
            out.writeDouble(slot.damage());
            out.writeBoolean(slot.occupied());
            out.writeDouble(slot.performance());
            out.writeDouble(slot.foodEnergy());
            out.writeDouble(slot.foodRadius());
            out.writeBoolean(slot.foodInsideLysosome());
            out.writeDouble(slot.targetFoodRadius());
            out.writeDouble(slot.layoutX());
            out.writeDouble(slot.layoutY());
            out.writeDouble(slot.layoutRadius());
            out.writeDouble(slot.layoutRotation());
            out.writeDouble(slot.targetLayoutX());
            out.writeDouble(slot.targetLayoutY());
            out.writeDouble(slot.targetLayoutRadius());
            out.writeDouble(slot.targetLayoutRotation());
        }
    }

    private void writeFlagellumSlots(DataOutputStream out, List<FlagellumSlotRenderDto> slots) throws IOException {
        List<FlagellumSlotRenderDto> safeSlots = safeList(slots);
        out.writeInt(safeSlots.size());
        for (FlagellumSlotRenderDto slot : safeSlots) {
            out.writeInt(slot.index());
            out.writeDouble(slot.motorPower());
            out.writeDouble(slot.damage());
            out.writeDouble(slot.performance());
            out.writeDouble(slot.baseX());
            out.writeDouble(slot.baseY());
            out.writeDouble(slot.directionX());
            out.writeDouble(slot.directionY());
            out.writeDouble(slot.length());
            out.writeDouble(slot.thickness());
            out.writeDouble(slot.force());
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
        out.writeDouble(visual.lysosomeGlowStrength());
        writeColor(out, visual.flagellumColor());
        out.writeInt(visual.flagellumCount());
        writeColor(out, visual.bioluminescenceColor());
        out.writeDouble(visual.bioluminescenceExpression());
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
            out.writeDouble(food.x());
            out.writeDouble(food.y());
            out.writeDouble(food.energy());
            out.writeDouble(food.radius());
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
        out.writeDouble(safe.opacity());
    }

    private int clampByte(int value) {
        return Math.max(0, Math.min(255, value));
    }

    private void writeNullableLong(DataOutputStream out, Long value) throws IOException {
        out.writeLong(value == null ? NULL_LONG : value);
    }

    private void writeNullableDouble(DataOutputStream out, Double value) throws IOException {
        out.writeDouble(value == null ? NULL_DOUBLE : value);
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
