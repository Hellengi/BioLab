import {getSelectedCell, state} from "../../store/store.js";
import { dom } from "../dom.js";
import { formatTwoDecimals, getCellRgbString, setText } from "../../core/utils.js";
import { drawSelectedCellPreview } from "../../render/preview.js";
import { getActiveTab, setSelectedTabEnabled, switchTab } from "./tabsPanel.js";

let _lastCollisionImpulse = null;
let _collisionImpulseHistory = [];
let lastSelectedCollisionImpulseId = null;
const COLLISION_FADE_SECONDS = 1.0;

export function recordCollisionImpulse(impulse, dirX, dirY) {
    const collisionImpulse = {
        impulse,
        dirX,
        dirY,
        ageSeconds: 0.0,
        lastWorldTick: state.world?.tick ?? null,
    };

    _lastCollisionImpulse = collisionImpulse;
    _collisionImpulseHistory.push(collisionImpulse);
    _refreshCollisionImpulseDisplay();
}

function _refreshCollisionImpulseDisplay() {
    if (!dom.selectedCellCollisionImpulse) return;

    const wrapper = document.getElementById('selectedCellImpulseRow');
    if (!wrapper) return;

    wrapper.classList.remove('hidden');
    wrapper.classList.add('impulse-visible');

    if (_lastCollisionImpulse) {
        setTooltipValue(
            dom.selectedCellCollisionImpulse,
            formatTwoDecimals(Math.abs(_lastCollisionImpulse.impulse)),
            "impulse = −(1 + restitution) ×<br>v<sub>normal</sub> / (1/mass₁ + 1/mass₂)\n" +
            "restitution = baseRestitution ×<br>√(elasticity₁ × elasticity₂)"
        );
    }
}

export function getCollisionImpulseHistory() {
    return _collisionImpulseHistory;
}

function updateCollisionImpulseLifetime() {
    if (!_lastCollisionImpulse && _collisionImpulseHistory.length === 0) return;

    const currentTick = state.world?.tick;
    if (typeof currentTick !== "number") return;

    const tickSeconds = Math.max(0.000001, (state.config?.tickRateMs ?? 10) / 1000.0);
    const tickScale = currentClientTickScale();

    for (const impulse of _collisionImpulseHistory) {
        if (impulse.lastWorldTick === null) {
            impulse.lastWorldTick = currentTick;
            continue;
        }

        const deltaTicks = Math.max(0, currentTick - impulse.lastWorldTick);
        impulse.lastWorldTick = currentTick;

        if (deltaTicks > 0) {
            impulse.ageSeconds += deltaTicks * tickSeconds * tickScale;
        }
    }

    _collisionImpulseHistory = _collisionImpulseHistory.filter(
        impulse => impulse.ageSeconds < COLLISION_FADE_SECONDS
    );

    if (_lastCollisionImpulse?.ageSeconds >= COLLISION_FADE_SECONDS) {
        clearLastCollisionImpulseDisplay();
    }
}

function currentClientTickScale() {
    const speedFactor = state.config?.speedFactor ?? 1.0;

    if (speedFactor <= 0.0) return 0.0;

    return speedFactor < 1.0 ? speedFactor : 1.0;
}

function clearLastCollisionImpulseDisplay() {
    const wrapper = document.getElementById('selectedCellImpulseRow');

    wrapper?.classList.remove('impulse-visible', 'impulse-fading');
    wrapper?.classList.add('hidden');

    _lastCollisionImpulse = null;
    clearTooltipElement(dom.selectedCellCollisionImpulse);
}

function clearCollisionImpulseDisplay() {
    _collisionImpulseHistory = [];
    clearLastCollisionImpulseDisplay();
}

export function getLastCollisionImpulse() {
    return _lastCollisionImpulse;
}

export function selectCell(cell) {
    if (!cell) throw new Error("Environment cell is required");
    if (state.selectedCellId !== cell.id) {
        lastSelectedCollisionImpulseId = null;
        clearCollisionImpulseDisplay();
    }
    state.selectedCellId = cell.id;
    updateSelectedCellPanel(cell);
    showCellContent(true);
    setSelectedTabEnabled(true);
    switchTab("selected");
}

export function clearSelection() {
    state.selectedCellId = null;
    state.selectedCellTemplate = null;
    lastSelectedCollisionImpulseId = null;
    clearCollisionImpulseDisplay();
    clearSelectedCellInfo();
    showCellContent(false);

    if (getActiveTab() === "selected") {
        switchTab("control");
    }

    setSelectedTabEnabled(false);
}

export function refreshSelection() {
    const cell = getSelectedCell();

    if (!cell) {
        clearSelection();
        return;
    }

    updateSelectedCellPanel(cell);
    recordSelectedCellCollisionImpulse(cell);
    updateCollisionImpulseLifetime();
}

function recordSelectedCellCollisionImpulse(cell) {
    const motion = cell.motion;

    if (!motion || motion.collisionImpulseId <= 0) return;

    const collisionKey = `${cell.id}:${motion.collisionImpulseId}`;
    if (collisionKey === lastSelectedCollisionImpulseId) return;

    lastSelectedCollisionImpulseId = collisionKey;

    recordCollisionImpulse(
        motion.collisionImpulse,
        motion.collisionNormalX,
        motion.collisionNormalY
    );
}

function updateSelectedCellPanel(cell) {
    state.selectedCellTemplate = mapWorldCellToTemplate(cell);

    const genome = state.selectedCellTemplate.genome;

    setText(dom.selectedCellCode, genome.code);
    setText(dom.selectedCellRadius, formatTwoDecimals(cell.radius));
    setText(dom.selectedCellDivisionThreshold, formatTwoDecimals(genome.divisionThreshold));
    setText(dom.selectedCellDivisionImpulse, formatTwoDecimals(genome.divisionImpulse));
    setText(dom.selectedCellDivisionAngle, formatTwoDecimals(genome.divisionAngle ?? 0) + "°");
    setText(dom.selectedCellElasticity, formatTwoDecimals(cell.genome?.elasticity));
    setText(dom.selectedCellRgb, getCellRgbString(state.selectedCellTemplate));

    setTooltipPair(
        dom.selectedCellMass,
        formatTwoDecimals(cell.mass),
        "mass = dryMass + energy × factor",
        formatTwoDecimals(genome.dryMass),
        "dry mass"
    );

    setTooltipPair(
        dom.selectedCellEnergy,
        formatTwoDecimals(cell.energy),
        "current energy",
        formatTwoDecimals(genome.maxEnergy),
        "maximum energy"
    );

    setTooltipValue(
        dom.selectedCellDensity,
        formatTwoDecimals(cell.density),
        "density = mass / (π × radius²)"
    );

    const motion = cell.motion ?? {};
    setText(dom.selectedCellSpeed, formatTwoDecimals(motion.speed ?? 0));

    const gravForce = motion.gravityBuoyancyForce ?? 0;
    const isSinking = gravForce >= 0;
    if (dom.selectedCellGravBuoyLabel) {
        dom.selectedCellGravBuoyLabel.textContent = isSinking ? "Gravity force" : "Buoyancy force";
    }

    setTooltipValue(
        dom.selectedCellGravBuoyForce,
        formatTwoDecimals(gravForce),
        "F<sub>grav/buoy</sub> = mass × gravity ×<br>(density − fluidDensity) / density"
    );

    setTooltipValue(
        dom.selectedCellDragForce,
        formatTwoDecimals(motion.dragForce ?? 0),
        "F<sub>drag</sub> = viscosity × radius × speed"
    );

    const illumination = cell.localLight ?? 0;
    setTooltipValue(
        dom.selectedCellIllumination,
        formatTwoDecimals(illumination * 100),
        "illumination = globalLight +<br>Σ brightness × r₀² / (distance² + r₀²) ×<br>exp(−turbidity × distance)\n" +
        "r₀ = falloffRadius"
    );

    drawSelectedCellPreview(cell, state.selectedCellTemplate);
}

function mapWorldCellToTemplate(cell) {
    return {
        id: null,
        name: null,
        genome: {
            divisionThreshold: cell.genome.divisionThreshold,
            divisionImpulse: cell.genome.divisionImpulse,
            divisionAngle: cell.genome.divisionAngle,
            colorHue: cell.genome.colorHue,
            saturation: cell.genome.saturation,
            lightness: cell.genome.lightness,
            maxEnergy: cell.genome.maxEnergy,
            dryMass: cell.genome.dryMass,
            elasticity: cell.genome.elasticity,
            code: cell.genome.code,
        }
    };
}

function showCellContent(hasCell) {
    dom.selectedCellContent?.classList.toggle("hidden", !hasCell);
    dom.saveSelectedCellBtn?.classList.toggle("hidden", !hasCell);
}

function clearSelectedCellInfo() {
    setText(dom.selectedCellCode, "");
    clearTooltipElement(dom.selectedCellEnergy);
    clearTooltipElement(dom.selectedCellMass);
    clearTooltipElement(dom.selectedCellDensity);
    setText(dom.selectedCellRadius, "");
    setText(dom.selectedCellDivisionThreshold, "");
    setText(dom.selectedCellDivisionImpulse, "");
    setText(dom.selectedCellDivisionAngle, "");
    setText(dom.selectedCellRgb, "");

    setText(dom.selectedCellSpeed, "");
    if (dom.selectedCellGravBuoyLabel) {
        dom.selectedCellGravBuoyLabel.textContent = "Grav/buoy force";
    }
    clearTooltipElement(dom.selectedCellGravBuoyForce);
    clearTooltipElement(dom.selectedCellDragForce);
    clearTooltipElement(dom.selectedCellIllumination);

    drawSelectedCellPreview(null, null);
}

function clearTooltipElement(element) {
    if (!element) return;
    element._tooltipPair = null;
    element._tooltipValue = null;
    clearElement(element);
}

function clearElement(element) {
    element.textContent = "";
    element.innerHTML = "";
}

function appendTooltipValue(parent, value, tooltipText) {
    const valueElement = document.createElement("span");
    valueElement.className = "cell-info-value cell-info-tooltip-host";

    const numberElement = document.createElement("span");
    numberElement.className = "cell-info-tooltip-number";
    numberElement.textContent = value;

    const tooltip = document.createElement("span");
    tooltip.className = "cell-info-tooltip";

    tooltipText.split('\n').forEach((line, i) => {
        if (i > 0) {
            const hr = document.createElement('hr');
            hr.className = 'cell-info-tooltip-divider';
            tooltip.appendChild(hr);
        }
        const span = document.createElement('span');
        span.innerHTML = line;
        tooltip.appendChild(span);
    });

    valueElement.addEventListener("mouseenter", () => {
        const rect = valueElement.getBoundingClientRect();
        const tooltipWidth = Math.min(tooltip.scrollWidth, 320);

        let left = rect.left;
        const top = rect.bottom + 6;

        if (left + tooltipWidth > window.innerWidth - 8) {
            left = window.innerWidth - tooltipWidth - 8;
        }

        tooltip.style.left = `${Math.max(8, left)}px`;
        tooltip.style.top = `${top}px`;
    });

    valueElement.appendChild(numberElement);
    valueElement.appendChild(tooltip);
    parent.appendChild(valueElement);

    return valueElement;
}

function updateTooltipValue(valueElement, value, tooltipText) {
    valueElement.querySelector(".cell-info-tooltip-number").textContent = value;

    const tooltip = valueElement.querySelector(".cell-info-tooltip");
    tooltip.innerHTML = '';
    tooltipText.split('\n').forEach((line, i) => {
        if (i > 0) {
            const hr = document.createElement('hr');
            hr.className = 'cell-info-tooltip-divider';
            tooltip.appendChild(hr);
        }
        const span = document.createElement('span');
        span.innerHTML = line;
        tooltip.appendChild(span);
    });
}

function setTooltipPair(element, leftValue, leftTooltip, rightValue, rightTooltip) {
    if (!element) return;

    if (!element._tooltipPair) {
        clearElement(element);

        element._tooltipPair = {
            left: appendTooltipValue(element, leftValue, leftTooltip),
            right: null
        };

        appendSeparator(element);
        element._tooltipPair.right = appendTooltipValue(element, rightValue, rightTooltip);
        return;
    }

    updateTooltipValue(element._tooltipPair.left, leftValue, leftTooltip);
    updateTooltipValue(element._tooltipPair.right, rightValue, rightTooltip);
}

function setTooltipValue(element, value, tooltipText) {
    if (!element) return;

    if (!element._tooltipValue) {
        clearElement(element);
        element._tooltipValue = appendTooltipValue(element, value, tooltipText);
        return;
    }

    updateTooltipValue(element._tooltipValue, value, tooltipText);
}

function appendSeparator(parent) {
    const separator = document.createElement("span");
    separator.className = "cell-info-separator";
    separator.textContent = "/";
    parent.appendChild(separator);
}