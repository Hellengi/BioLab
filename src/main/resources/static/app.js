const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");
const statsEl = document.getElementById("stats");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");

const worldNameInput = document.getElementById("worldNameInput");
const saveWorldBtn = document.getElementById("saveWorldBtn");
const savedWorldsList = document.getElementById("savedWorldsList");
const loadSelectedWorldBtn = document.getElementById("loadSelectedWorldBtn");
const deleteSelectedWorldBtn = document.getElementById("deleteSelectedWorldBtn");

const cellPanelEmpty = document.getElementById("cellPanelEmpty");
const cellPanelSelected = document.getElementById("cellPanelSelected");
const cellPanelCreate = document.getElementById("cellPanelCreate");

const startCreateCellBtn = document.getElementById("startCreateCellBtn");
const cancelCreateCellBtn = document.getElementById("cancelCreateCellBtn");
const armPlaceCellBtn = document.getElementById("armPlaceCellBtn");

const savedCellTemplatesList = document.getElementById("savedCellTemplatesList");
const loadCellTemplateBtn = document.getElementById("loadCellTemplateBtn");
const deleteCellTemplateBtn = document.getElementById("deleteCellTemplateBtn");

const selectedCellDivisionThreshold = document.getElementById("selectedCellDivisionThreshold");
const selectedCellDivisionImpulse = document.getElementById("selectedCellDivisionImpulse");
const selectedCellPreviewCanvas = document.getElementById("selectedCellPreviewCanvas");
const selectedCellPreviewCtx = selectedCellPreviewCanvas
    ? selectedCellPreviewCanvas.getContext("2d")
    : null;

const selectedCellCode = document.getElementById("selectedCellCode");
const selectedCellEnergy = document.getElementById("selectedCellEnergy");
const selectedCellRgb = document.getElementById("selectedCellRgb");
const selectedCellSpeed = document.getElementById("selectedCellSpeed");

const saveSelectedCellNameInput = document.getElementById("saveSelectedCellNameInput");
const saveSelectedCellBtn = document.getElementById("saveSelectedCellBtn");

const createCellTemplateNameInput = document.getElementById("createCellTemplateNameInput");
const createDivisionThresholdInput = document.getElementById("createDivisionThresholdInput");
const createDivisionImpulseInput = document.getElementById("createDivisionImpulseInput");
const createColorHueInput = document.getElementById("createColorHueInput");
const createLightnessInput = document.getElementById("createLightnessInput");
const createMaxEnergyInput = document.getElementById("createMaxEnergyInput");
const saveCreateTemplateBtn = document.getElementById("saveCreateTemplateBtn");
const createCellModeHint = document.getElementById("createCellModeHint");
const saveSelectedCellSuccess = document.getElementById("saveSelectedCellSuccess");
const saveCreateTemplateSuccess = document.getElementById("saveCreateTemplateSuccess");

let worldState = null;
let simulationConfig = null;
let socket = null;
let draftSettings = null;

let previousDeadCellsById = new Map();
let deadCellDisappearEffects = [];

let savedWorlds = [];

let selectedSaprotrophId = null;
let selectedCellTemplate = null;
let savedCellTemplates = [];
let createCellDraft = null;
let placementModeArmed = false;

const DEAD_CELL_DISAPPEAR_EFFECT_DURATION_MS = 500;
const DEAD_CELL_DISAPPEAR_EFFECT_MAX_BLUR_PX = 12;
const DEAD_CELL_DISAPPEAR_EFFECT_GROWTH = 1.35;

const settingsBtn = document.getElementById("settingsBtn");

const settingsOverlay = document.getElementById("settingsOverlay");
const initialSaprotrophCountSlider = document.getElementById("initialSaprotrophCountSlider");
const initialSaprotrophCountValue = document.getElementById("initialSaprotrophCountValue");

const foodSpawnRateSlider = document.getElementById("foodSpawnRateSlider");
const foodSpawnRateValue = document.getElementById("foodSpawnRateValue");

const deadCellLifetimeTicksSlider = document.getElementById("deadCellLifetimeTicksSlider");
const deadCellLifetimeTicksValue = document.getElementById("deadCellLifetimeTicksValue");

const resetSettingsBtn = document.getElementById("resetSettingsBtn");
const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

const createCellPreviewCanvas = document.getElementById("createCellPreviewCanvas");
const createCellPreviewCtx = createCellPreviewCanvas
    ? createCellPreviewCanvas.getContext("2d")
    : null;

const createDivisionThresholdSlider = document.getElementById("createDivisionThresholdSlider");
const createDivisionImpulseSlider = document.getElementById("createDivisionImpulseSlider");
const createColorHueSlider = document.getElementById("createColorHueSlider");
const createLightnessSlider = document.getElementById("createLightnessSlider");
const createMaxEnergySlider = document.getElementById("createMaxEnergySlider");

async function loadSimulationConfig() {
    const response = await fetch("/api/simulation/config");

    if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status}`);
    }

    simulationConfig = await response.json();
}

function applySimulationConfig() {
    if (!simulationConfig) {
        return;
    }

    canvas.width = simulationConfig.worldWidth;
    canvas.height = simulationConfig.worldHeight;
}

function showCellPanelMode(mode) {
    saveSelectedCellSuccess?.classList.remove("visible");
    saveCreateTemplateSuccess?.classList.remove("visible");
    cellPanelEmpty?.classList.add("hidden");
    cellPanelSelected?.classList.add("hidden");
    cellPanelCreate?.classList.add("hidden");

    if (mode === "selected") {
        cellPanelSelected?.classList.remove("hidden");
    } else if (mode === "create") {
        cellPanelCreate?.classList.remove("hidden");
    } else {
        cellPanelEmpty?.classList.remove("hidden");
    }
}

function buildDefaultCreateCellDraft() {
    return {
        id: null,
        name: null,
        code: "",
        divisionThreshold: 50.0,
        divisionImpulseStrength: 2.0,
        colorHue: 195.0,
        lightness: 62.0,
        maxEnergy: 60.0
    };
}

function syncCreateCellForm() {
    if (!createCellDraft) {
        return;
    }

    createDivisionThresholdSlider.value = String(createCellDraft.divisionThreshold);
    createDivisionThresholdInput.value = String(createCellDraft.divisionThreshold);

    createDivisionImpulseSlider.value = String(createCellDraft.divisionImpulseStrength);
    createDivisionImpulseInput.value = String(createCellDraft.divisionImpulseStrength);

    createColorHueSlider.value = String(createCellDraft.colorHue);
    createColorHueInput.value = String(createCellDraft.colorHue);

    createLightnessSlider.value = String(createCellDraft.lightness);
    createLightnessInput.value = String(createCellDraft.lightness);

    createMaxEnergySlider.value = String(createCellDraft.maxEnergy);
    createMaxEnergyInput.value = String(createCellDraft.maxEnergy);

    drawCreateCellPreview();
}

function readCreateCellDraftFromForm() {
    const divisionThreshold = Number(createDivisionThresholdInput.value);
    const divisionImpulseStrength = Number(createDivisionImpulseInput.value);
    const colorHue = Number(createColorHueInput.value);
    const lightness = Number(createLightnessInput.value);
    const maxEnergy = Number(createMaxEnergyInput.value);

    const values = [
        divisionThreshold,
        divisionImpulseStrength,
        colorHue,
        lightness,
        maxEnergy
    ];

    if (values.some(value => !Number.isFinite(value))) {
        throw new Error("Invalid create-cell form values");
    }

    return {
        id: null,
        name: null,
        code: "",
        divisionThreshold,
        divisionImpulseStrength,
        colorHue,
        lightness,
        maxEnergy
    };
}

function bindRangeAndNumber(rangeInput, numberInput, onChange) {
    if (!rangeInput || !numberInput) {
        return;
    }

    rangeInput.addEventListener("input", () => {
        numberInput.value = rangeInput.value;
        onChange();
    });

    numberInput.addEventListener("input", () => {
        rangeInput.value = numberInput.value;
        onChange();
    });
}

function setPlacementModeArmed(value) {
    placementModeArmed = value;
    createCellModeHint.textContent = value
        ? "Placement mode is ON — click on the field"
        : "Placement mode is off";

    canvas.classList.toggle("cell-create-mode-active", value);
}

function clearSelectedCell() {
    selectedSaprotrophId = null;
    selectedCellTemplate = null;
    saveSelectedCellNameInput.value = "";

    setText(selectedCellCode, "");
    setText(selectedCellEnergy, "");
    setText(selectedCellDivisionThreshold, "");
    setText(selectedCellDivisionImpulse, "");
    setText(selectedCellRgb, "");
    setText(selectedCellSpeed, "");

    drawSelectedCellPreview(null, null);

    if (createCellDraft) {
        showCellPanelMode("create");
    } else {
        showCellPanelMode("empty");
    }
}

async function fetchSavedCellTemplates() {
    const response = await fetch("/api/cells/templates");

    if (!response.ok) {
        throw new Error(`Failed to load cell templates: ${response.status}`);
    }

    savedCellTemplates = await response.json();
    renderSavedCellTemplates();
}

function renderSavedCellTemplates() {
    savedCellTemplatesList.innerHTML = "";

    for (const cell of savedCellTemplates) {
        const option = document.createElement("option");
        option.value = String(cell.id);
        option.textContent = cell.name;
        savedCellTemplatesList.appendChild(option);
    }
}

function showSuccessToast(element) {
    if (!element) {
        return;
    }

    element.classList.add("visible");

    setTimeout(() => {
        element.classList.remove("visible");
    }, 1600);
}

function roundTo(value, digits) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function formatTwoDecimals(value) {
    return roundTo(value, 2).toFixed(2);
}

function hslToRgb(h, s, l) {
    const hue = ((h % 360) + 360) % 360;
    const sat = Math.max(0, Math.min(100, s)) / 100;
    const lig = Math.max(0, Math.min(100, l)) / 100;

    const c = (1 - Math.abs(2 * lig - 1)) * sat;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = lig - c / 2;

    let rPrime = 0;
    let gPrime = 0;
    let bPrime = 0;

    if (hue < 60) {
        rPrime = c;
        gPrime = x;
    } else if (hue < 120) {
        rPrime = x;
        gPrime = c;
    } else if (hue < 180) {
        gPrime = c;
        bPrime = x;
    } else if (hue < 240) {
        gPrime = x;
        bPrime = c;
    } else if (hue < 300) {
        rPrime = x;
        bPrime = c;
    } else {
        rPrime = c;
        bPrime = x;
    }

    return {
        r: Math.round((rPrime + m) * 255),
        g: Math.round((gPrime + m) * 255),
        b: Math.round((bPrime + m) * 255)
    };
}

function getSelectedCellRgbString(cellTemplate) {
    const rgb = hslToRgb(
        cellTemplate.colorHue,
        100,
        cellTemplate.lightness
    );

    return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

function drawSelectedCellPreview(worldCell, cellTemplate) {
    if (!selectedCellPreviewCtx || !selectedCellPreviewCanvas) {
        return;
    }

    const ctx2 = selectedCellPreviewCtx;
    const width = selectedCellPreviewCanvas.width;
    const height = selectedCellPreviewCanvas.height;

    ctx2.clearRect(0, 0, width, height);

    ctx2.fillStyle = "#181818";
    ctx2.fillRect(0, 0, width, height);

    if (!worldCell || !cellTemplate) {
        return;
    }

    const centerX = width / 2;
    const centerY = height / 2;

    const energyRatio = cellTemplate.maxEnergy > 0
        ? Math.max(0, Math.min(1, worldCell.energy / cellTemplate.maxEnergy))
        : 0;

    const saturation = 50 + energyRatio * 50;

    const previewRadius = 42;

    ctx2.beginPath();
    ctx2.arc(centerX, centerY, previewRadius, 0, Math.PI * 2);
    ctx2.fillStyle = `hsl(${cellTemplate.colorHue}, ${saturation}%, ${cellTemplate.lightness}%)`;
    ctx2.fill();

    const speed = Math.hypot(worldCell.vx, worldCell.vy);
    if (speed > 0) {
        const dirX = worldCell.vx / speed;
        const dirY = worldCell.vy / speed;

        const arrowLength = Math.min(70, Math.max(18, speed * 14));
        const endX = centerX + dirX * arrowLength;
        const endY = centerY + dirY * arrowLength;

        ctx2.beginPath();
        ctx2.moveTo(centerX, centerY);
        ctx2.lineTo(endX, endY);
        ctx2.strokeStyle = "#ffffff";
        ctx2.lineWidth = 1;
        ctx2.stroke();

        const headSize = 7;
        const angle = Math.atan2(dirY, dirX);

        ctx2.beginPath();
        ctx2.moveTo(endX, endY);
        ctx2.lineTo(
            endX - Math.cos(angle - Math.PI / 6) * headSize,
            endY - Math.sin(angle - Math.PI / 6) * headSize
        );
        ctx2.moveTo(endX, endY);
        ctx2.lineTo(
            endX - Math.cos(angle + Math.PI / 6) * headSize,
            endY - Math.sin(angle + Math.PI / 6) * headSize
        );
        ctx2.strokeStyle = "#ffffff";
        ctx2.lineWidth = 1;
        ctx2.stroke();
    }
}

function drawCreateCellPreview() {
    if (!createCellPreviewCtx || !createCellPreviewCanvas) {
        return;
    }

    const ctx2 = createCellPreviewCtx;
    const width = createCellPreviewCanvas.width;
    const height = createCellPreviewCanvas.height;

    ctx2.clearRect(0, 0, width, height);
    ctx2.fillStyle = "#181818";
    ctx2.fillRect(0, 0, width, height);

    if (!createCellDraft) {
        return;
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const previewRadius = 42;

    ctx2.beginPath();
    ctx2.arc(centerX, centerY, previewRadius, 0, Math.PI * 2);
    ctx2.fillStyle = `hsl(${createCellDraft.colorHue}, 100%, ${createCellDraft.lightness}%)`;
    ctx2.fill();

    const speed = createCellDraft.divisionImpulseStrength;
    const arrowLength = Math.min(70, Math.max(18, speed * 14));

    ctx2.beginPath();
    ctx2.moveTo(centerX, centerY);
    ctx2.lineTo(centerX + arrowLength, centerY);
    ctx2.strokeStyle = "#ffffff";
    ctx2.lineWidth = 1;
    ctx2.stroke();

    const headSize = 7;
    const endX = centerX + arrowLength;
    const endY = centerY;

    ctx2.beginPath();
    ctx2.moveTo(endX, endY);
    ctx2.lineTo(endX - headSize, endY - headSize / 2);
    ctx2.moveTo(endX, endY);
    ctx2.lineTo(endX - headSize, endY + headSize / 2);
    ctx2.strokeStyle = "#ffffff";
    ctx2.lineWidth = 1;
    ctx2.stroke();
}

function mapWorldCellToSelectedTemplate(worldCell) {
    return {
        id: null,
        name: null,
        code: worldCell.genome.code,
        divisionThreshold: worldCell.genome.divisionThreshold,
        divisionImpulseStrength: worldCell.genome.divisionImpulseStrength,
        colorHue: worldCell.genome.colorHue,
        lightness: worldCell.genome.lightness,
        maxEnergy: worldCell.genome.maxEnergy
    };
}

function selectSaprotroph(worldCell) {
    if (!worldCell) {
        throw new Error("World cell is required");
    }

    selectedSaprotrophId = worldCell.id;
    selectedCellTemplate = mapWorldCellToSelectedTemplate(worldCell);

    const speed = Math.hypot(worldCell.vx, worldCell.vy);

    setText(selectedCellCode, selectedCellTemplate.code);
    setText(
        selectedCellEnergy,
        `${formatTwoDecimals(worldCell.energy)} / ${formatTwoDecimals(selectedCellTemplate.maxEnergy)}`
    );
    setText(selectedCellDivisionThreshold, formatTwoDecimals(selectedCellTemplate.divisionThreshold));
    setText(selectedCellDivisionImpulse, formatTwoDecimals(selectedCellTemplate.divisionImpulseStrength));
    setText(selectedCellRgb, getSelectedCellRgbString(selectedCellTemplate));
    setText(selectedCellSpeed, formatTwoDecimals(speed));

    drawSelectedCellPreview(worldCell, selectedCellTemplate);
    showCellPanelMode("selected");
}

function refreshSelectedCellPanelFromWorldState() {
    if (!selectedSaprotrophId || !worldState?.saprotrophs) {
        return;
    }

    const selectedWorldCell = worldState.saprotrophs.find(cell => cell.id === selectedSaprotrophId);

    if (!selectedWorldCell) {
        clearSelectedCell();
        return;
    }

    selectedCellTemplate = mapWorldCellToSelectedTemplate(selectedWorldCell);

    const speed = Math.hypot(selectedWorldCell.vx, selectedWorldCell.vy);

    setText(selectedCellCode, selectedCellTemplate.code);
    setText(
        selectedCellEnergy,
        `${formatTwoDecimals(selectedWorldCell.energy)} / ${formatTwoDecimals(selectedCellTemplate.maxEnergy)}`
    );
    setText(selectedCellDivisionThreshold, formatTwoDecimals(selectedCellTemplate.divisionThreshold));
    setText(selectedCellDivisionImpulse, formatTwoDecimals(selectedCellTemplate.divisionImpulseStrength));
    setText(selectedCellRgb, getSelectedCellRgbString(selectedCellTemplate));
    setText(selectedCellSpeed, formatTwoDecimals(speed));

    drawSelectedCellPreview(selectedWorldCell, selectedCellTemplate);
}

function setText(element, value) {
    if (element) {
        element.textContent = value;
    }
}

async function saveSelectedCellToDb() {
    if (!selectedCellTemplate) {
        return;
    }

    const name = saveSelectedCellNameInput.value.trim();
    if (!name) {
        alert("Введите имя шаблона клетки");
        return;
    }

    const response = await fetch("/api/cells/templates", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            cell: selectedCellTemplate
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to save cell template: ${response.status}`);
    }

    await fetchSavedCellTemplates();
    showSuccessToast(saveSelectedCellSuccess);
}

async function loadCellTemplateToCreatePanel() {
    const selectedId = savedCellTemplatesList.value;

    if (!selectedId) {
        alert("Выберите шаблон клетки");
        return;
    }

    const response = await fetch(`/api/cells/templates/${selectedId}`);

    if (!response.ok) {
        throw new Error(`Failed to load cell template: ${response.status}`);
    }

    createCellDraft = await response.json();
    createCellTemplateNameInput.value = createCellDraft.name ?? "";
    syncCreateCellForm();
    showCellPanelMode("create");
}

async function deleteSelectedCellTemplate() {
    const selectedId = savedCellTemplatesList.value;

    if (!selectedId) {
        alert("Выберите шаблон клетки для удаления");
        return;
    }

    const confirmed = confirm("Удалить выбранный шаблон клетки?");
    if (!confirmed) {
        return;
    }

    const response = await fetch(`/api/cells/templates/${selectedId}`, {
        method: "DELETE"
    });

    if (!response.ok) {
        throw new Error(`Failed to delete cell template: ${response.status}`);
    }

    await fetchSavedCellTemplates();
}

async function spawnCellAt(x, y) {
    if (!createCellDraft) {
        return;
    }

    const response = await fetch("/api/cells/spawn", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            x,
            y,
            cell: createCellDraft
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to spawn cell: ${response.status}`);
    }
}

function getCanvasCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function findSaprotrophAt(x, y) {
    if (!worldState || !worldState.saprotrophs) {
        return null;
    }

    for (let i = worldState.saprotrophs.length - 1; i >= 0; i--) {
        const cell = worldState.saprotrophs[i];
        const dx = x - cell.x;
        const dy = y - cell.y;

        if (dx * dx + dy * dy <= cell.radius * cell.radius) {
            return cell;
        }
    }

    return null;
}

function connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    socket = new WebSocket(`${protocol}://${window.location.host}/ws/simulation`);

    socket.onopen = () => {
        console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
        worldState = JSON.parse(event.data);
        refreshSelectedCellPanelFromWorldState();
        updateStats();
    };

    socket.onclose = () => {
        console.log("WebSocket disconnected. Reconnecting...");
        setTimeout(connectWebSocket, 1000);
    };

    socket.onerror = (error) => {
        console.error("WebSocket error", error);
        socket.close();
    };
}

function render() {
    if (!worldState || !simulationConfig) {
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#202020";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const food of worldState.foods) {
        drawFood(food);
    }

    for (const saprotroph of worldState.saprotrophs) {
        drawSaprotroph(saprotroph)
    }

    drawSelectedCellOutline();

    for (const deadCell of worldState.deadCells) {
        drawDeadCell(deadCell);
    }

    detectDeadCellDisappearEffects();
    drawDeadCellDisappearEffects();
}

function drawSelectedCellOutline() {
    if (!selectedSaprotrophId || !worldState || !worldState.saprotrophs) {
        return;
    }

    const selectedCell = worldState.saprotrophs.find(cell => cell.id === selectedSaprotrophId);
    if (!selectedCell) {
        selectedSaprotrophId = null;
        selectedCellTemplate = null;
        showCellPanelMode(createCellDraft ? "create" : "empty");
        return;
    }

    ctx.beginPath();
    ctx.arc(selectedCell.x, selectedCell.y, selectedCell.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "#6ee7ff";
    ctx.lineWidth = 2;
    ctx.stroke();
}

function animationLoop() {
    if (worldState && simulationConfig) {
        render();
    }

    requestAnimationFrame(animationLoop);
}

function updateStats() {
    if (!worldState || !simulationConfig) {
        return;
    }

    statsEl.textContent =
        `Tick: ${worldState.tick} | Running: ${worldState.running} | ` +
        `Saprotrophs: ${worldState.saprotrophCount} | Dead cells: ${worldState.deadCellCount} | Food: ${worldState.foodCount} | ` +
        `World: ${simulationConfig.worldWidth}x${simulationConfig.worldHeight}`;
}

async function post(url) {
    await fetch(url, { method: "POST" });
}

async function openSettingsModal() {
    if (!simulationConfig) {
        return;
    }

    draftSettings = {
        initialSaprotrophCount: simulationConfig.initialSaprotrophCount,
        foodGenerationIntensity: simulationConfig.foodGenerationIntensity,
        deadCellLifetimeTicks: simulationConfig.deadCellLifetimeTicks
    };

    syncSettingsFormFromDraft();
    await fetchSavedWorlds();
    settingsOverlay.classList.remove("hidden");
}

function closeSettingsModal() {
    settingsOverlay.classList.add("hidden");
}

function syncSettingsFormFromDraft() {
    if (!draftSettings) {
        return;
    }

    initialSaprotrophCountSlider.value = String(draftSettings.initialSaprotrophCount);
    initialSaprotrophCountValue.value = String(draftSettings.initialSaprotrophCount);

    foodSpawnRateSlider.value = String(draftSettings.foodGenerationIntensity);
    foodSpawnRateValue.value = String(draftSettings.foodGenerationIntensity);

    deadCellLifetimeTicksSlider.value = String(draftSettings.deadCellLifetimeTicks);
    deadCellLifetimeTicksValue.value = String(draftSettings.deadCellLifetimeTicks);
}

async function saveDraftSettings() {
    if (!simulationConfig || !draftSettings) {
        return;
    }

    const payload = {
        ...simulationConfig,
        initialSaprotrophCount: draftSettings.initialSaprotrophCount,
        foodGenerationIntensity: draftSettings.foodGenerationIntensity,
        deadCellLifetimeTicks: draftSettings.deadCellLifetimeTicks
    };

    const response = await fetch("/api/simulation/config", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Failed to save config: ${response.status}`);
    }

    simulationConfig = await response.json();
    closeSettingsModal();
    updateStats();
}

async function fetchSavedWorlds() {
    const response = await fetch("/api/simulation/worlds");

    if (!response.ok) {
        throw new Error(`Failed to load saved worlds: ${response.status}`);
    }

    savedWorlds = await response.json();
    renderSavedWorldsList();
}

function renderSavedWorldsList() {
    savedWorldsList.innerHTML = "";

    for (const world of savedWorlds) {
        const option = document.createElement("option");
        option.value = String(world.id);
        option.textContent = `${world.name} (${formatSavedWorldDate(world.createdAt)})`;
        savedWorldsList.appendChild(option);
    }
}

function formatSavedWorldDate(value) {
    const date = new Date(value);
    return date.toLocaleString();
}

async function saveCurrentWorld() {
    const name = worldNameInput.value.trim();

    if (!name) {
        alert("Введите имя мира");
        return;
    }

    const response = await fetch("/api/simulation/worlds", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
    });

    if (!response.ok) {
        throw new Error(`Failed to save world: ${response.status}`);
    }

    await fetchSavedWorlds();
}

async function loadSelectedWorld() {
    const selectedId = savedWorldsList.value;

    if (!selectedId) {
        alert("Выберите сохранённый мир");
        return;
    }

    const response = await fetch(`/api/simulation/worlds/${selectedId}/load`, {
        method: "POST"
    });

    if (!response.ok) {
        throw new Error(`Failed to load world: ${response.status}`);
    }

    const configResponse = await fetch("/api/simulation/config");
    if (!configResponse.ok) {
        throw new Error(`Failed to reload config after world load: ${configResponse.status}`);
    }

    simulationConfig = await configResponse.json();
    applySimulationConfig();
    resetClientState();
    render();
    updateStats();
    closeSettingsModal();
}

async function deleteSelectedWorld() {
    const selectedId = savedWorldsList.value;

    if (!selectedId) {
        alert("Выберите мир для удаления");
        return;
    }

    const confirmed = confirm("Удалить выбранный мир?");
    if (!confirmed) {
        return;
    }

    const response = await fetch(`/api/simulation/worlds/${selectedId}`, {
        method: "DELETE"
    });

    if (!response.ok) {
        throw new Error(`Failed to delete world: ${response.status}`);
    }

    await fetchSavedWorlds();
}

async function resetConfigToDefaultsOnServer() {
    const response = await fetch("/api/simulation/config/reset", {
        method: "POST"
    });

    if (!response.ok) {
        throw new Error(`Failed to reset config: ${response.status}`);
    }

    simulationConfig = await response.json();
    draftSettings = {
        initialSaprotrophCount: simulationConfig.initialSaprotrophCount,
        foodGenerationIntensity: simulationConfig.foodGenerationIntensity,
        deadCellLifetimeTicks: simulationConfig.deadCellLifetimeTicks
    };
    syncSettingsFormFromDraft();
    updateStats();
}

async function initializePage() {
    resetClientState();
    await loadSimulationConfig();
    applySimulationConfig();
    await fetchSavedCellTemplates();
    showCellPanelMode("empty");
    bindRangeAndNumber(createDivisionThresholdSlider, createDivisionThresholdInput, () => {
        createCellDraft = readCreateCellDraftFromForm();
        drawCreateCellPreview();
    });

    bindRangeAndNumber(createDivisionImpulseSlider, createDivisionImpulseInput, () => {
        createCellDraft = readCreateCellDraftFromForm();
        drawCreateCellPreview();
    });

    bindRangeAndNumber(createColorHueSlider, createColorHueInput, () => {
        createCellDraft = readCreateCellDraftFromForm();
        drawCreateCellPreview();
    });

    bindRangeAndNumber(createLightnessSlider, createLightnessInput, () => {
        createCellDraft = readCreateCellDraftFromForm();
        drawCreateCellPreview();
    });

    bindRangeAndNumber(createMaxEnergySlider, createMaxEnergyInput, () => {
        createCellDraft = readCreateCellDraftFromForm();
        drawCreateCellPreview();
    });
    connectWebSocket();
    requestAnimationFrame(animationLoop);
}

function startDeadCellDisappearEffect(deadCell) {
    deadCellDisappearEffects.push({
        x: deadCell.x,
        y: deadCell.y,
        radius: deadCell.radius,
        startTime: performance.now()
    });
}

function detectDeadCellDisappearEffects() {
    const currentDeadCellsById = new Map(
        (worldState.deadCells || []).map(deadCell => [deadCell.id, deadCell])
    );

    for (const [deadCellId, previousDeadCell] of previousDeadCellsById.entries()) {
        if (!currentDeadCellsById.has(deadCellId)) {
            startDeadCellDisappearEffect(previousDeadCell);
        }
    }

    previousDeadCellsById = currentDeadCellsById;
}

function drawDeadCellDisappearEffects() {
    const now = performance.now();

    deadCellDisappearEffects = deadCellDisappearEffects.filter(effect => {
        const progress = (now - effect.startTime) / DEAD_CELL_DISAPPEAR_EFFECT_DURATION_MS;

        if (progress >= 1) {
            return false;
        }

        const blurPx = progress * DEAD_CELL_DISAPPEAR_EFFECT_MAX_BLUR_PX;
        const alpha = 1 - progress;
        const radius = effect.radius * (1 + progress * (DEAD_CELL_DISAPPEAR_EFFECT_GROWTH - 1));

        ctx.save();
        ctx.filter = `blur(${blurPx}px)`;
        ctx.globalAlpha = alpha;

        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#7a4b2f";
        ctx.fill();

        ctx.restore();

        return true;
    });
}

function drawFood(food) {
    if (food.consumed) {
        return;
    }

    const radius = food.radius;

    ctx.beginPath();
    ctx.arc(food.x, food.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "hsl(52, 85%, 60%)";
    ctx.fill();
}

function drawSaprotroph(saprotroph) {
    const radius = saprotroph.radius;

    ctx.beginPath();
    ctx.arc(saprotroph.x, saprotroph.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${saprotroph.genome.colorHue}, ${saprotroph.genome.saturation}%, ${saprotroph.genome.lightness}%)`;
    ctx.fill();

    drawDirectionVector(saprotroph);
}

function drawDeadCell(deadCell) {
    const radius = deadCell.radius;

    ctx.beginPath();
    ctx.arc(deadCell.x, deadCell.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#7a4b2f";
    ctx.fill();
}

function drawDirectionVector(cell) {
    const vectorLength = Math.hypot(cell.vx, cell.vy) || 1;
    const directionX = cell.vx / vectorLength;
    const directionY = cell.vy / vectorLength;

    ctx.beginPath();
    ctx.moveTo(cell.x, cell.y);
    ctx.lineTo(
        cell.x + directionX * simulationConfig.clientDirectionVectorLength,
        cell.y + directionY * simulationConfig.clientDirectionVectorLength
    );
    ctx.strokeStyle = "#ff8c42";
    ctx.stroke();
}

function resetClientState() {
    previousDeadCellsById = new Map();
    deadCellDisappearEffects = [];

    selectedSaprotrophId = null;
    selectedCellTemplate = null;
    createCellDraft = null;
    placementModeArmed = false;

    if (saveSelectedCellNameInput) {
        saveSelectedCellNameInput.value = "";
    }

    if (createCellTemplateNameInput) {
        createCellTemplateNameInput.value = "";
    }

    setText(selectedCellCode, "");
    setText(selectedCellEnergy, "");
    setText(selectedCellDivisionThreshold, "");
    setText(selectedCellDivisionImpulse, "");
    setText(selectedCellRgb, "");
    setText(selectedCellSpeed, "");

    drawSelectedCellPreview(null, null);
    drawCreateCellPreview();

    if (canvas) {
        canvas.classList.remove("cell-create-mode-active");
    }

    if (createCellModeHint) {
        createCellModeHint.textContent = "Placement mode is off";
    }

    showCellPanelMode("empty");
}

initialSaprotrophCountSlider.addEventListener("input", () => {
    const value = Number(initialSaprotrophCountSlider.value);
    draftSettings.initialSaprotrophCount = value;
    initialSaprotrophCountValue.value = String(value);
});

initialSaprotrophCountValue.addEventListener("input", () => {
    const value = Number(initialSaprotrophCountValue.value);
    draftSettings.initialSaprotrophCount = value;
    initialSaprotrophCountSlider.value = String(value);
});

foodSpawnRateSlider.addEventListener("input", () => {
    const value = Number(foodSpawnRateSlider.value);
    draftSettings.foodGenerationIntensity = value;
    foodSpawnRateValue.value = String(value);
});

foodSpawnRateValue.addEventListener("input", () => {
    const value = Math.max(0, Math.min(100, Number(foodSpawnRateValue.value)));
    draftSettings.foodGenerationIntensity = value;
    foodSpawnRateSlider.value = String(value);
    foodSpawnRateValue.value = String(value);
});

deadCellLifetimeTicksSlider.addEventListener("input", () => {
    const value = Number(deadCellLifetimeTicksSlider.value);
    draftSettings.deadCellLifetimeTicks = value;
    deadCellLifetimeTicksValue.value = String(value);
});

deadCellLifetimeTicksValue.addEventListener("input", () => {
    const value = Number(deadCellLifetimeTicksValue.value);
    draftSettings.deadCellLifetimeTicks = value;
    deadCellLifetimeTicksSlider.value = String(value);
});

saveWorldBtn.addEventListener("click", () => {
    saveCurrentWorld().catch((error) => {
        console.error("Save world error", error);
        alert("Не удалось сохранить мир");
    });
});

loadSelectedWorldBtn.addEventListener("click", () => {
    loadSelectedWorld().catch((error) => {
        console.error("Load world error", error);
        alert("Не удалось загрузить мир");
    });
});

deleteSelectedWorldBtn.addEventListener("click", () => {
    deleteSelectedWorld().catch((error) => {
        console.error("Delete world error", error);
        alert("Не удалось удалить мир");
    });
});

settingsBtn.addEventListener("click", () => {
    openSettingsModal().catch((error) => {
        console.error("Open settings error", error);
        alert("Не удалось открыть настройки");
    });
});
cancelSettingsBtn.addEventListener("click", closeSettingsModal);
saveSettingsBtn.addEventListener("click", saveDraftSettings);
resetSettingsBtn.addEventListener("click", resetConfigToDefaultsOnServer);

settingsOverlay.addEventListener("click", (event) => {
    if (event.target === settingsOverlay) {
        closeSettingsModal();
    }
});

startBtn.addEventListener("click", () => post("/api/simulation/start"));
stopBtn.addEventListener("click", () => post("/api/simulation/stop"));
resetBtn.addEventListener("click", async () => {
    await post("/api/simulation/reset");
    resetClientState();

    const response = await fetch("/api/simulation/config");
    if (!response.ok) {
        throw new Error(`Failed to load config after reset: ${response.status}`);
    }

    simulationConfig = await response.json();
    applySimulationConfig();
    render();
    updateStats();
});

canvas.addEventListener("click", (event) => {
    const { x, y } = getCanvasCoordinates(event);

    if (placementModeArmed && createCellDraft) {
        try {
            createCellDraft = readCreateCellDraftFromForm();
        } catch (error) {
            console.error("Create cell form error", error);
            alert("Проверьте значения в форме создания клетки");
            return;
        }

        spawnCellAt(x, y).catch((error) => {
            console.error("Spawn cell error", error);
            alert("Не удалось создать клетку");
        });

        return;
    }

    const clickedCell = findSaprotrophAt(x, y);

    if (clickedCell) {
        try {
            selectSaprotroph(clickedCell);
        } catch (error) {
            console.error("Select cell error", error);
            alert("Не удалось выбрать клетку");
        }
        return;
    }

    clearSelectedCell();
});

startCreateCellBtn.addEventListener("click", () => {
    createCellDraft = buildDefaultCreateCellDraft();
    createCellTemplateNameInput.value = "";
    syncCreateCellForm();
    setPlacementModeArmed(false);
    showCellPanelMode("create");
});

cancelCreateCellBtn.addEventListener("click", () => {
    createCellDraft = null;
    setPlacementModeArmed(false);
    drawCreateCellPreview();
    showCellPanelMode(selectedSaprotrophId ? "selected" : "empty");
});

armPlaceCellBtn.addEventListener("click", () => {
    try {
        createCellDraft = readCreateCellDraftFromForm();
    } catch (error) {
        console.error("Create cell form error", error);
        alert("Проверьте значения в форме создания клетки");
        return;
    }

    drawCreateCellPreview();
    setPlacementModeArmed(true);
});

loadCellTemplateBtn.addEventListener("click", () => {
    loadCellTemplateToCreatePanel().catch((error) => {
        console.error("Load cell template error", error);
        alert("Не удалось загрузить шаблон клетки");
    });
});

deleteCellTemplateBtn.addEventListener("click", () => {
    deleteSelectedCellTemplate().catch((error) => {
        console.error("Delete cell template error", error);
        alert("Не удалось удалить шаблон клетки");
    });
});

saveSelectedCellBtn.addEventListener("click", () => {
    saveSelectedCellToDb().catch((error) => {
        console.error("Save selected cell error", error);
        alert("Не удалось сохранить клетку");
    });
});

saveCreateTemplateBtn.addEventListener("click", async () => {
    let draft;

    try {
        draft = readCreateCellDraftFromForm();
    } catch (error) {
        console.error("Create cell form error", error);
        alert("Проверьте значения в форме создания клетки");
        return;
    }

    const name = createCellTemplateNameInput.value.trim();

    if (!name) {
        alert("Введите имя шаблона клетки");
        return;
    }

    try {
        const response = await fetch("/api/cells/templates", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                cell: draft
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to save create template: ${response.status}`);
        }

        await fetchSavedCellTemplates();
        showSuccessToast(saveCreateTemplateSuccess);
    } catch (error) {
        console.error("Save create template error", error);
        alert("Не удалось сохранить шаблон");
    }
});

initializePage().catch((error) => {
    console.error("Initialization error", error);
    statsEl.textContent = "Ошибка загрузки конфигурации";
});
