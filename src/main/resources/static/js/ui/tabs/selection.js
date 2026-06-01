import { dom } from "../dom.js";
import { formatTwoDecimals, getCellRgbString, setText } from "../../core/utils.js";
import { drawSelectedCellPreview } from "../../render/preview.js";
import {getActiveTab, getLastTab, setSelectedTabEnabled, switchTab} from "./_tabs.js";
import {getSelectedCell, state} from "../../store/state.js";
import { clearTooltipElement, setTooltipPair, setTooltipValue } from "../cell-info.js";

function refreshCollisionImpulseDisplay(cell) {
    if (!dom.selectedCellCollisionImpulse) return;

    const wrapper = document.getElementById('selectedCellImpulseRow');
    if (!wrapper) return;

    const lastImpulse = getLastCollisionImpulse(cell);

    if (!lastImpulse) {
        clearCollisionImpulseDisplay();
        return;
    }

    wrapper.classList.remove('hidden');
    wrapper.classList.add('impulse-visible');

    setTooltipValue(
        dom.selectedCellCollisionImpulse,
        formatTwoDecimals(Math.abs(lastImpulse.impulse ?? 0)),
        "impulse = −(1 + restitution) ×<br>v<sub>normal</sub> / (1/mass₁ + 1/mass₂)\n" +
        "restitution = baseRestitution ×<br>√(elasticity₁ × elasticity₂)"
    );
}

function clearCollisionImpulseDisplay() {
    const wrapper = document.getElementById('selectedCellImpulseRow');

    wrapper?.classList.remove('impulse-visible', 'impulse-fading');
    wrapper?.classList.add('hidden');

    clearTooltipElement(dom.selectedCellCollisionImpulse);
}

const EVENT_TYPE_IMPULSE = "impulse";

export function getCollisionImpulseHistory(cell = getSelectedCell()) {
    return (cell?.events ?? []).filter(event => event.type === EVENT_TYPE_IMPULSE);
}

function getLastCollisionImpulse(cell) {
    const impulses = getCollisionImpulseHistory(cell);
    return impulses.length > 0 ? impulses[impulses.length - 1] : null;
}

export function selectCell(cell) {
    if (!cell) throw new Error("Environment cell is required");
    if (state.selectedCellId !== cell.id) {
        clearCollisionImpulseDisplay();
    }
    state.selectedCellId = cell.id;
    updateSelectedCellPanel(cell);
    refreshCollisionImpulseDisplay(cell);
    showCellContent(true);
    setSelectedTabEnabled(true);
    switchTab("selected");
}

export function clearSelection() {
    state.selectedCellId = null;
    state.selectedStrain = null;
    clearCollisionImpulseDisplay();
    clearSelectedCellInfo();
    showCellContent(false);

    if (getActiveTab() === "selected") {
        switchTab(getLastTab());
    }

    setSelectedTabEnabled(false);
}

export function refreshSelection() {
    const cell = getSelectedCell();

    if (!cell || cell.dead) {
        clearSelection();
        return;
    }

    updateSelectedCellPanel(cell);
    refreshCollisionImpulseDisplay(cell);
}

function updateSelectedCellPanel(cell) {
    state.selectedStrain = mapWorldCellToTemplate(cell);

    const genome = state.selectedStrain.genome;

    setText(dom.selectedCellCode, genome.code);
    setText(dom.selectedCellRadius, formatTwoDecimals(cell.radius));
    setText(dom.selectedCellDivisionThreshold, formatTwoDecimals(genome.divisionThreshold));
    setText(dom.selectedCellDivisionImpulse, formatTwoDecimals(genome.divisionImpulse));
    setText(dom.selectedCellDivisionAngle, formatTwoDecimals(genome.divisionAngle ?? 0) + "°");
    setText(dom.selectedCellElasticity, formatTwoDecimals(cell.genome?.elasticity));
    setText(dom.selectedCellRgb, getCellRgbString(state.selectedStrain));

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

    const gravForce = motion.gravForce ?? 0;
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
        "rв‚Ђ = falloffRadius"
    );

    drawSelectedCellPreview(cell, state.selectedStrain);
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
