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
    if (version !== 3) {
        throw new Error(`Unsupported binary render version: ${version}`);
    }

    const messageType = reader.uint8();
    if (messageType !== MESSAGE_RENDER_FRAME) {
        throw new Error(`Unsupported binary render message type: ${messageType}`);
    }

    const tick = reader.longNumber();
    const time = reader.float32();
    const foodSpawnProgress = reader.float32();
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
    const globalLight = reader.float32();
    const cycleTick = reader.float32();
    const sourceCount = reader.int32();
    const sources = [];
    for (let i = 0; i < sourceCount; i++) {
        sources.push({
            x: reader.float32(),
            y: reader.float32(),
            brightness: reader.float32(),
            orbitRadius: reader.float32(),
            orbitSpeed: reader.float32(),
            angle: reader.float32(),
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
        spatialGridCells: [],
    };
}

function readCells(reader) {
    const count = reader.int32();
    const cells = new Array(count);
    for (let i = 0; i < count; i++) {
        const id = reader.longNumber();
        const cell = {
            id,
            x: reader.float32(),
            y: reader.float32(),
            vx: reader.float32(),
            vy: reader.float32(),
            angularVelocity: reader.float32(),
            energy: reader.float32(),
            maxEnergy: reader.nullableFloat32(),
            radius: reader.float32(),
            nucleusOffsetX: reader.float32(),
            nucleusOffsetY: reader.float32(),
            nucleusRadius: reader.float32(),
            nucleusTargetOffsetX: reader.float32(),
            nucleusTargetOffsetY: reader.float32(),
        };
        const flags = reader.uint8();
        cell.dead = Boolean(flags & FLAG_DEAD);
        cell.lifetimeTicks = reader.longNumber();
        cell.localLight = reader.float32();
        cell.mass = reader.float32();
        cell.dryMass = reader.nullableFloat32();
        cell.density = reader.float32();
        cell.opacity = reader.nullableFloat32();
        cell.nucleusDamage = reader.float32();
        cell.cellDamage = reader.float32();
        cell.cpDamage = reader.float32();
        cell.membraneDamage = reader.float32();
        cell.lysosomeDamage = reader.float32();
        cell.flagellumDamage = reader.float32();
        cell.membraneLightTransmittance = reader.float32();
        cell.lysosomeCapacity = reader.int32();
        cell.lysosomeOccupiedSlots = reader.int32();
        cell.lysosomeSlots = readLysosomeSlots(reader);
        cell.flagellumCapacity = reader.int32();
        cell.flagellumSlots = readFlagellumSlots(reader);
        cell.visual = readVisual(reader);
        cell.directionAngle = reader.float32();
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
            damage: reader.float32(),
            occupied: reader.bool(),
            performance: reader.float32(),
            foodEnergy: reader.float32(),
            foodRadius: reader.float32(),
            foodInsideLysosome: reader.bool(),
            targetFoodRadius: reader.float32(),
            layoutX: reader.float32(),
            layoutY: reader.float32(),
            layoutRadius: reader.float32(),
            layoutRotation: reader.float32(),
            targetLayoutX: reader.float32(),
            targetLayoutY: reader.float32(),
            targetLayoutRadius: reader.float32(),
            targetLayoutRotation: reader.float32(),
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
            motorPower: reader.float32(),
            damage: reader.float32(),
            performance: reader.float32(),
            baseX: reader.float32(),
            baseY: reader.float32(),
            directionX: reader.float32(),
            directionY: reader.float32(),
            length: reader.float32(),
            thickness: reader.float32(),
            force: reader.float32(),
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
        lysosomeGlowStrength: reader.float32(),
        flagellumColor: reader.color(),
        flagellumCount: reader.int32(),
        bioluminescenceColor: reader.color(),
        bioluminescenceExpression: reader.float32(),
        lightDirectionAngle: reader.nullableFloat32(),
        lightGradient: reader.nullableFloat32(),
        highlightDirectionAngle: reader.nullableFloat32(),
        highlightStrength: reader.nullableFloat32(),
        highlightClarity: reader.nullableFloat32(),
    };
}

function readFoods(reader) {
    const count = reader.int32();
    const foods = new Array(count);
    for (let i = 0; i < count; i++) {
        const id = reader.longNumber();
        const food = {
            id,
            x: reader.float32(),
            y: reader.float32(),
            energy: reader.float32(),
            radius: reader.float32(),
        };
        const flags = reader.uint8();
        food.consumed = Boolean(flags & FLAG_FOOD_CONSUMED);
        food.insideLysosome = Boolean(flags & FLAG_FOOD_INSIDE_LYSOSOME);
        food.capturedByCellId = reader.nullableLongNumber();
        food.digestionSlotIndex = reader.int32();
        food.capturedCellAnchorX = reader.nullableFloat32();
        food.capturedCellAnchorY = reader.nullableFloat32();
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

    float32() {
        const value = this.view.getFloat32(this.offset, false);
        this.offset += 4;
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

    nullableFloat32() {
        const value = this.float32();
        return Number.isNaN(value) ? null : value;
    }

    color() {
        return {
            r: this.uint8(),
            g: this.uint8(),
            b: this.uint8(),
            opacity: this.float32(),
        };
    }
}
