const MAGIC_BLR1 = 0x424c5231;
const MESSAGE_RENDER_FRAME = 1;
const NULL_LONG = -(2n ** 63n);
const FLAG_DEAD = 1;
const FLAG_FOOD_CONSUMED = 1;
const FLAG_FOOD_INSIDE_LYSOSOME = 2;

export function decodeBinaryRenderFrame(buffer) {
    const reader = new BinaryReader(buffer);
    const magic = reader.int32();
    if (magic !== MAGIC_BLR1) {
        throw new Error(`Unsupported binary render magic: ${magic.toString(16)}`);
    }

    const version = reader.uint16();
    if (version !== 2) {
        throw new Error(`Unsupported binary render version: ${version}`);
    }

    const messageType = reader.uint8();
    if (messageType !== MESSAGE_RENDER_FRAME) {
        throw new Error(`Unsupported binary render message type: ${messageType}`);
    }

    const tick = reader.longNumber();
    const time = reader.float64();
    const foodSpawnProgress = reader.float64();
    const tubeDiameter = reader.int32();
    const tps = reader.nullableLongNumber();
    const lighting = readLightingMetadata(reader);
    const cells = readCells(reader);
    const foods = readFoods(reader);

    return {
        type: "renderFrame",
        tick,
        time,
        foodSpawnProgress,
        tubeDiameter,
        cells,
        foods,
        lighting,
        tps,
    };
}

function readLightingMetadata(reader) {
    const globalLight = reader.float64();
    const cycleTick = reader.float64();
    const sourceCount = reader.int32();
    const sources = [];
    for (let i = 0; i < sourceCount; i++) {
        sources.push({
            x: reader.float64(),
            y: reader.float64(),
            brightness: reader.float64(),
            orbitRadius: reader.float64(),
            orbitSpeed: reader.float64(),
            angle: reader.float64(),
            renderType: reader.uint8() === 0 ? "EDGE" : "POINT",
        });
    }

    return {
        globalLight,
        cycleTick,
        sources,
        gridStep: reader.int32(),
        gridWidth: reader.int32(),
        gridHeight: reader.int32(),
        lightMap: null,
        directedLightMap: null,
        scatteredLightMap: null,
        opacityMap: null,
        lightDirectionArrows: [],
        quadtreeNodes: [],
    };
}

function readCells(reader) {
    const count = reader.int32();
    const cells = new Array(count);
    for (let i = 0; i < count; i++) {
        const id = reader.longNumber();
        const cell = {
            id,
            x: reader.float64(),
            y: reader.float64(),
            vx: reader.float64(),
            vy: reader.float64(),
            angularVelocity: reader.float64(),
            energy: reader.float64(),
            maxEnergy: reader.nullableFloat64(),
            radius: reader.float64(),
            nucleusOffsetX: reader.float64(),
            nucleusOffsetY: reader.float64(),
            nucleusRadius: reader.float64(),
            nucleusTargetOffsetX: reader.float64(),
            nucleusTargetOffsetY: reader.float64(),
        };
        const flags = reader.uint8();
        cell.dead = Boolean(flags & FLAG_DEAD);
        cell.lifetimeTicks = reader.longNumber();
        cell.localLight = reader.float64();
        cell.mass = reader.float64();
        cell.dryMass = reader.nullableFloat64();
        cell.density = reader.float64();
        cell.opacity = reader.nullableFloat64();
        cell.nucleusDamage = reader.float64();
        cell.cellDamage = reader.float64();
        cell.cpDamage = reader.float64();
        cell.membraneDamage = reader.float64();
        cell.lysosomeDamage = reader.float64();
        cell.flagellumDamage = reader.float64();
        cell.membraneLightTransmittance = reader.float64();
        cell.lysosomeCapacity = reader.int32();
        cell.lysosomeOccupiedSlots = reader.int32();
        cell.lysosomeSlots = readLysosomeSlots(reader);
        cell.flagellumCapacity = reader.int32();
        cell.flagellumSlots = readFlagellumSlots(reader);
        cell.visual = readVisual(reader);
        cell.directionAngle = reader.float64();
        cells[i] = cell;
    }
    return cells;
}

function readLysosomeSlots(reader) {
    const count = reader.int32();
    const slots = new Array(count);
    for (let i = 0; i < count; i++) {
        slots[i] = {
            index: reader.int32(),
            foodId: reader.nullableLongNumber(),
            damage: reader.float64(),
            occupied: reader.bool(),
            performance: reader.float64(),
            foodEnergy: reader.float64(),
            foodRadius: reader.float64(),
            foodInsideLysosome: reader.bool(),
            targetFoodRadius: reader.float64(),
            layoutX: reader.float64(),
            layoutY: reader.float64(),
            layoutRadius: reader.float64(),
            layoutRotation: reader.float64(),
            targetLayoutX: reader.float64(),
            targetLayoutY: reader.float64(),
            targetLayoutRadius: reader.float64(),
            targetLayoutRotation: reader.float64(),
        };
    }
    return slots;
}

function readFlagellumSlots(reader) {
    const count = reader.int32();
    const slots = new Array(count);
    for (let i = 0; i < count; i++) {
        slots[i] = {
            index: reader.int32(),
            motorPower: reader.float64(),
            damage: reader.float64(),
            performance: reader.float64(),
            baseX: reader.float64(),
            baseY: reader.float64(),
            directionX: reader.float64(),
            directionY: reader.float64(),
            length: reader.float64(),
            thickness: reader.float64(),
            force: reader.float64(),
        };
    }
    return slots;
}

function readVisual(reader) {
    return {
        cellColor: reader.color(),
        membraneColor: reader.color(),
        nucleoidColor: reader.color(),
        cytosolColor: reader.color(),
        chloroplastColor: reader.color(),
        chloroplastAmount: reader.int32(),
        lysosomeColor: reader.color(),
        lysosomeAmount: reader.int32(),
        lysosomeGlowColor: reader.color(),
        lysosomeGlowStrength: reader.float64(),
        flagellumColor: reader.color(),
        flagellumCount: reader.int32(),
        bioluminescenceColor: reader.color(),
        bioluminescenceExpression: reader.float64(),
        lightDirectionAngle: reader.nullableFloat64(),
        lightGradient: reader.nullableFloat64(),
        highlightDirectionAngle: reader.nullableFloat64(),
        highlightStrength: reader.nullableFloat64(),
        highlightClarity: reader.nullableFloat64(),
    };
}

function readFoods(reader) {
    const count = reader.int32();
    const foods = new Array(count);
    for (let i = 0; i < count; i++) {
        const id = reader.longNumber();
        const food = {
            id,
            x: reader.float64(),
            y: reader.float64(),
            energy: reader.float64(),
            radius: reader.float64(),
        };
        const flags = reader.uint8();
        food.consumed = Boolean(flags & FLAG_FOOD_CONSUMED);
        food.insideLysosome = Boolean(flags & FLAG_FOOD_INSIDE_LYSOSOME);
        food.capturedByCellId = reader.nullableLongNumber();
        food.digestionSlotIndex = reader.int32();
        food.capturedCellAnchorX = reader.nullableFloat64();
        food.capturedCellAnchorY = reader.nullableFloat64();
        foods[i] = food;
    }
    return foods;
}

class BinaryReader {
    constructor(buffer) {
        this.view = new DataView(buffer);
        this.offset = 0;
    }

    uint8() {
        const value = this.view.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    bool() {
        return this.uint8() !== 0;
    }

    uint16() {
        const value = this.view.getUint16(this.offset, false);
        this.offset += 2;
        return value;
    }

    int32() {
        const value = this.view.getInt32(this.offset, false);
        this.offset += 4;
        return value;
    }

    float64() {
        const value = this.view.getFloat64(this.offset, false);
        this.offset += 8;
        return value;
    }

    longBigInt() {
        const value = this.view.getBigInt64(this.offset, false);
        this.offset += 8;
        return value;
    }

    longNumber() {
        return Number(this.longBigInt());
    }

    nullableLongNumber() {
        const value = this.longBigInt();
        return value === NULL_LONG ? null : Number(value);
    }

    nullableFloat64() {
        const value = this.float64();
        return Number.isNaN(value) ? null : value;
    }

    color() {
        return {
            r: this.uint8(),
            g: this.uint8(),
            b: this.uint8(),
            opacity: this.float64(),
        };
    }
}
