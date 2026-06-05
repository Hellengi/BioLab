import { dom } from "../dom.js";
import { formatTwoDecimals, getCellRgbString, setText } from "../../core/utils.js";
import { drawSelectedCellPreview } from "../../render/preview.js";
import { getActiveTab, getLastTab, setSelectedTabEnabled, switchTab } from "./_tabs.js";
import { getSelectedCell, setSelectedInfoScope, state } from "../../store/state.js";
import { clearTooltipElement, setTooltipValue } from "../cell-info.js";
import { sendDisplayLayers } from "../../transport/ws/socket.js";
import { t } from "../../localization/localization.js";

const SELECTION_PANEL_REFRESH_INTERVAL_MS = 120;
let lastSelectionPanelRefreshMs = 0;
let lastSelectionPanelCellId = null;

export function selectCell(cell) {
    if (!cell) throw new Error("Environment cell is required");
    state.selectedCellId = cell.id;
    state.selectedPreviewNotice = cell.dead ? { type: "dead" } : null;
    if (!state.selectedPreviewMode) state.selectedPreviewMode = "general";
    updateSelectedCellPanel(cell);
    lastSelectionPanelRefreshMs = performance.now();
    lastSelectionPanelCellId = cell.id;
    showCellContent(true);
    setSelectedTabEnabled(true);
    switchTab("selected");
    sendDisplayLayers();
}

export function clearSelection() {
    const hadSelection = state.selectedCellId != null
        || state.selectedStrain != null
        || lastSelectionPanelCellId != null
        || getActiveTab() === "selected";

    if (!hadSelection) {
        setSelectedTabEnabled(false);
        return;
    }

    syncSelectedCellTitle(null);
    state.selectedCellId = null;
    state.selectedStrain = null;
    state.selectedInfoScope = "general";
    state.selectedPreviewNotice = null;
    lastSelectionPanelCellId = null;
    lastSelectionPanelRefreshMs = 0;
    clearSelectedCellInfo();
    showCellContent(false);
    if (getActiveTab() === "selected") switchTab(getLastTab());
    setSelectedTabEnabled(false);
    sendDisplayLayers();
}

export function refreshSelection(force = false) {
    const cell = getSelectedCell();
    if (!cell) {
        if (state.selectedCellId == null) {
            lastSelectionPanelCellId = null;
            lastSelectionPanelRefreshMs = 0;
            return;
        }

        clearSelection();
        return;
    }
    const now = performance.now();
    const cellChanged = lastSelectionPanelCellId !== cell.id;
    if (!force && !cellChanged && now - lastSelectionPanelRefreshMs < SELECTION_PANEL_REFRESH_INTERVAL_MS) return;
    updateSelectedCellPanel(cell, { skipInfoRender: !force && isSelectedInfoTooltipActive() });
    lastSelectionPanelRefreshMs = now;
    lastSelectionPanelCellId = cell.id;
}

function syncSelectedCellTitle() {
    if (!dom.selectedCellTitle) return;
    dom.selectedCellTitle.textContent = t("Cell Selection");
}

function isSelectedInfoTooltipActive() {
    const active = document.activeElement;
    return Boolean(dom.selectedInfoGrid?.querySelector(
        ".cell-info-tooltip-host:hover, .cell-info-tooltip-host.app-tooltip--visible"
    )) || Boolean(active?.closest?.("#selectedInfoGrid .cell-info-tooltip-host"));
}

function updateSelectedCellPanel(cell, options = {}) {
    syncSelectedCellTitle(cell);
    state.selectedStrain = mapWorldCellToTemplate(cell);
    const mode = state.selectedPreviewMode ?? "general";
    syncScopeButtons(dom.selectedInfoScopeControls, "data-info-scope", state.selectedInfoScope ?? "general", {
        lockOrganelles: mode === "forces",
    });
    if (!options.skipInfoRender) {
        renderSelectedInfo(cell, state.selectedInfoScope ?? "general");
    }
    drawSelectedCellPreview(cell, state.selectedStrain);
}

function renderSelectedInfo(cell, scope) {
    const grid = dom.selectedInfoGrid;
    if (!grid) return;
    clearGrid(grid);
    const mode = state.selectedPreviewMode ?? "general";

    if (mode === "forces") {
        renderForcesInfo(grid, cell);
        return;
    }
    if (mode === "health") {
        renderHealthInfo(grid, cell, scope);
        return;
    }
    if (mode === "energy") {
        renderEnergyInfo(grid, cell, scope);
        return;
    }
    renderGeneralInfo(grid, cell, scope);
}

function renderGeneralInfo(grid, cell, scope) {
    const genome = cell.genome ?? {};
    const visual = cell.visual ?? {};
    if (scope === "nucleus") {
        row(grid, "Division threshold", formatTwoDecimals(genome.divisionThreshold), "CellDivEnergyThreshold = 2 × CellDivEnergyCost × NcDivThreshold / 50");
        row(grid, "Division impulse", formatTwoDecimals(genome.divisionImpulse), "NcDivImpulseCost = NcDivImpulse² / (2 × CellMass)");
        row(grid, "Division angle", `${formatTwoDecimals(genome.divisionAngle ?? 0)}°`, "DivisionAxis = CellAngle + NcDivAngle");
        row(grid, "Start/Cell damage", formatTwoDecimals(cell.cellDamage ?? 0), "Nucleus uses CellDamage as global inheritable damage pressure");
        row(grid, "Color / opacity", rgbaString(visual.nucleoidColor), "NucleusColor = mix(BaseNucleusColor, DamageColor, CellDamage)");
        return;
    }
    if (scope === "cytosol") {
        row(grid, "Mass", formatTwoDecimals(genome.dryMass), "CtMass = CtMassFactor × dryMass + Energy × EnergyToMassFactor");
        row(grid, "Max energy", formatTwoDecimals(genome.maxEnergy), "CellEnergy is clamped by CytosolMaxEnergy");
        row(grid, "GFP", formatTwoDecimals(genome.gfp ?? 0), "GfpEnergyConsumption = GfpExpression × CytosolGfpConsumptionFactor");
        row(grid, "Cytosol color / opacity", rgbaString(visual.cytosolColor), "CytosolColor = weighted(BaseCytosolColor, Nucleus/Chloroplast/Lysosome influence, CellDamage); membrane color is not included");
        return;
    }
    if (scope === "membrane") {
        row(grid, "Elasticity", formatTwoDecimals(genome.elasticity), "Restitution = baseRestitution × √(elasticity₁ × elasticity₂)");
        row(grid, "Melanin", `${genome.melaninEnabled ? t("on") : t("off")} / ${formatTwoDecimals(genome.melaninPercent ?? 0)}%`, "MembraneOpacity = BaseOpacity + MelaninOpacityFactor × MelaninPercent");
        row(grid, "Light transmittance", formatTwoDecimals(cell.membraneLightTransmittance ?? 0), "MembraneLightTransmittance = exp(−MembraneOpacity)");
        row(grid, "Color / opacity", rgbaString(visual.membraneColor), "MembraneColor = mix(BaseMembraneColor, MelaninColor, MelaninPercent)");
        return;
    }
    if (scope === "chloroplast") {
        row(grid, "Enabled", t(String(Boolean(genome.chloroplastEnabled))), "CpEnabled controls the presence of chloroplasts");
        row(grid, "Amount", formatTwoDecimals(genome.chloroplastAmount ?? 0), "CpTotalArea = CpAmount × CpArea; this no longer increases CellArea");
        row(grid, "Chlorophyll", `${formatTwoDecimals(genome.chlorophyll ?? 0)}%`, "Chlorophyll increases green pigment and captured light");
        row(grid, "Carotenoids", `${formatTwoDecimals(genome.carotenoids ?? 0)}%`, "CarotProtection = 1 − exp(−CarotProtectionFactor × CarotPercent / ChlorPercent)");
        row(grid, "Cp damage", formatTwoDecimals(cell.cpDamage ?? 0), "CpDamage reduces PhotosynthesisCapacity by CpHealth = exp(−CpDamage)");
        row(grid, "Color / opacity", rgbaString(visual.chloroplastColor), "ChloroplastColor blends chlorophyll, carotenoids and CpDamage bleaching toward near-white");
        return;
    }

    if (scope === "lysosome") {
        row(grid, "Enabled", t(String(Boolean(genome.lysosomeEnabled))), "LysosomeEnabled controls food capture and digestion");
        row(grid, "Amount", formatTwoDecimals(genome.lysosomeAmount ?? 0), "LysosomeCapacity = LysosomeAmount; one food piece per lysosome");
        row(grid, "Enzyme activity", `${formatTwoDecimals(genome.lysosomeEnzymeActivity ?? 0)}%`, "Higher activity digests faster, but increases energy cost and damage risk");
        row(grid, "Food slots", `${cell.lysosomeOccupiedSlots ?? 0} / ${cell.lysosomeCapacity ?? 0}`, "Captured food occupies a lysosome slot immediately on contact");
        row(grid, "Lysosome damage", formatTwoDecimals(cell.lysosomeDamage ?? 0), "Average damage across lysosome vesicles");
        row(grid, "Color / opacity", rgbaString(visual.lysosomeColor), "LysosomeColor = acidic vesicle color mixed with damage");
        return;
    }

    row(grid, "Status", cell.dead ? t("Dead") : t("Alive"), "Dead cells can be inspected like living cells until they decay");
    row(grid, "Code", genome.code ?? "", "Genome code");
    row(grid, "Energy", `${formatTwoDecimals(cell.energy)} / ${formatTwoDecimals(genome.maxEnergy)}`, "CellEnergy += Production − Consumption − RepairCost");
    row(grid, "Mass", formatTwoDecimals(cell.mass), "CellMass = NcMass + CtMass + MbMass + CpTotalMass + LyTotalMass");
    row(grid, "Radius", formatTwoDecimals(cell.radius), "CellRadius = sqrt(CellArea / π)");
    row(grid, "Area", formatTwoDecimals(Math.PI * (cell.radius ?? 0) * (cell.radius ?? 0)), "CellArea = π × CellRadius²");
    row(grid, "Density", formatTwoDecimals(cell.density), "CellDensity = CellMass / CellArea");
    row(grid, "Elasticity", formatTwoDecimals(genome.elasticity), "MembraneElasticity participates in collision restitution");
    row(grid, "Cell damage", formatTwoDecimals(cell.cellDamage ?? 0), "CellDamage accumulates from photo-stress, low energy and CpDamage leakage");
    row(grid, "Cp damage", formatTwoDecimals(cell.cpDamage ?? 0), "CpDamage bleaches chloroplasts; without chloroplasts it does not tint the cell");
    row(grid, "Lysosome damage", formatTwoDecimals(cell.lysosomeDamage ?? 0), "Damaged lysosomes digest worse and can leak into CellDamage");
    row(grid, "Food slots", `${cell.lysosomeOccupiedSlots ?? 0} / ${cell.lysosomeCapacity ?? 0}`, "Lysosomes are required for food contact, capture and digestion");
}

function renderForcesInfo(grid, cell) {
    const m = cell.motion ?? {};
    row(grid, "Speed", formatTwoDecimals(m.speed ?? 0), "Speed = sqrt(vx² + vy²)");
    row(grid, "Gravity/buoyancy", formatTwoDecimals(m.gravForce ?? 0), "Fgrav/buoy = mass × gravity × (density − fluidDensity) / density");
    row(grid, "Drag", formatTwoDecimals(m.dragForce ?? 0), "Fdrag = viscosity × radius × speed");
    const impulse = getLastCollisionImpulse(cell);
    row(grid, "Collision impulse", impulse ? formatTwoDecimals(Math.abs(impulse.impulse ?? 0)) : "0.00", "impulse = −(1 + restitution) × vnormal / (1/mass₁ + 1/mass₂)");
    row(grid, "Illumination", formatTwoDecimals((cell.localLight ?? 0) * 100), "Irradiance = globalLight + local sources attenuated by optical density");
}

function renderHealthInfo(grid, cell, scope) {
    if (scope === "general") {
        row(grid, "Cell performance", `${Math.round(damagePerformance(cell.cellDamage ?? 0) * 100)}%`, "CellPerformance = exp(−CellDamage)");
        row(grid, "Chloroplast performance", `${Math.round(damagePerformance(cell.cpDamage ?? 0) * 100)}%`, "CpPerformance = exp(−CpDamage); this reduces PhotosynthesisCapacity first");
        row(grid, "Lysosome performance", `${Math.round(damagePerformance(cell.lysosomeDamage ?? 0) * 100)}%`, "LysosomePerformance = exp(−LyDamage); this reduces digestion and yield");
        row(grid, "Cell damage", formatTwoDecimals(cell.cellDamage ?? 0), "CellDamage kills the cell and blocks division only through the existing CellDivDamageMax rule");
        row(grid, "Cp damage", formatTwoDecimals(cell.cpDamage ?? 0), "CpDamage does not block division directly; high CpDamage leaks into CellDamage");
        row(grid, "Lysosome damage", formatTwoDecimals(cell.lysosomeDamage ?? 0), "High lysosome damage leaks into CellDamage and can eject captured food");
        row(grid, "Cell damage rate", formatTwoDecimals(cell.cellDamageRate ?? 0), "CellDamageRate = DirectPhotoDamage + CpLeakDamage + LowEnergyDamage");
        row(grid, "Cp damage rate", formatTwoDecimals(cell.cpPhotoDamageRate ?? 0), "CpPhotoDamageRate = PhotoStress² × CpPhotoDamageFactor × (1 − CarotProtection)");
        row(grid, "Lysosome damage rate", formatTwoDecimals(cell.lysosomeDamageRate ?? 0), "LyDamageRate rises during active digestion, high enzyme activity and low-energy stress");
        row(grid, "Cell repair rate", formatTwoDecimals(cell.cellRepairRate ?? 0), "CellRepairRate is limited by RepairCapacity and available energy");
        row(grid, "Cp repair rate", formatTwoDecimals(cell.cpRepairRate ?? 0), "CpRepairRate is repaired before global CellDamage repair");
        row(grid, "Lysosome repair rate", formatTwoDecimals(cell.lysosomeRepairRate ?? 0), "LyRepairRate consumes energy to stabilize lysosome membranes");
        row(grid, "Rate components", healthRateComponents(cell, scope), "Concrete rates used this tick; repair subtracts from accumulated damage");
        return;
    }

    const lysosome = scope === "lysosome";
    const cp = scope === "chloroplast";
    const damage = lysosome ? cell.lysosomeDamage ?? 0 : (cp ? cell.cpDamage ?? 0 : cell.cellDamage ?? 0);
    const damageRate = lysosome ? cell.lysosomeDamageRate ?? 0 : (cp ? cell.cpPhotoDamageRate ?? 0 : cell.cellDamageRate ?? 0);
    const repairRate = lysosome ? cell.lysosomeRepairRate ?? 0 : (cp ? cell.cpRepairRate ?? 0 : cell.cellRepairRate ?? 0);
    row(grid, "Performance", `${Math.round(damagePerformance(damage) * 100)}%`, lysosome ? "LyPerformance = exp(−LyDamage); lowers digestion and yield" : (cp ? "CpPerformance = exp(−CpDamage); lowers photosynthesis capacity" : "CellPerformance = exp(−CellDamage); lowers repair capacity and can kill the cell"));
    row(grid, "Damage", formatTwoDecimals(damage), lysosome ? "LyDamage accumulates from active digestion and enzyme stress" : (cp ? "CpDamage accumulates from excess photochemical light" : "CellDamage accumulates from direct photo-stress, low energy and organelle leakage"));
    row(grid, "Damage rate", formatTwoDecimals(damageRate), lysosome ? "Incoming lysosome damage before repair" : (cp ? "Incoming Cp damage before repair" : "Incoming Cell damage before repair"));
    row(grid, "Repair rate", formatTwoDecimals(repairRate), lysosome ? "LyRepairRate = repaired lysosome damage per tick" : (cp ? "CpRepairRate = repaired CpDamage per tick" : "CellRepairRate = repaired CellDamage per tick"));
    row(grid, "Rate components", healthRateComponents(cell, scope), "Concrete damage and repair factors for this scope");
}

function renderEnergyInfo(grid, cell, scope) {
    row(grid, "Production", formatTwoDecimals(energyProductionFor(cell, scope)), "Production is localized in chloroplasts or lysosomes depending on scope");
    row(grid, "Consumption", formatTwoDecimals(energyConsumptionFor(cell, scope)), "Consumption already includes repair energy cost when repair is active");
    row(grid, "Rate components", energyRateComponents(cell, scope), "Concrete production and consumption factors for this scope");
}

function energyProductionFor(cell, scope) {
    const photosynthesis = Math.max(0, cell.energyProduction ?? 0);
    const digestion = Math.max(0, cell.digestionEnergyProduction ?? 0);
    if (scope === "lysosome") return digestion;
    if (scope === "chloroplast") return photosynthesis;
    return scope === "general" ? photosynthesis + digestion : 0;
}

function energyConsumptionFor(cell, scope) {
    const total = Math.max(0, cell.energyConsumption ?? 0);
    const repair = Math.max(0, cell.repairEnergyCostRate ?? 0);
    const base = Math.max(0, total - repair);
    if (scope === "nucleus") return base * 0.13;
    if (scope === "cytosol") return base * 0.43 + repair;
    if (scope === "membrane") return base * 0.18;
    if (scope === "chloroplast") return base * 0.24;
    if (scope === "lysosome") return base * 0.08 + Math.max(0, cell.digestionEnergyCostRate ?? 0) + Math.max(0, cell.lysosomeRepairEnergyCostRate ?? 0);
    return total;
}

function healthRateComponents(cell, scope) {
    if (scope === "lysosome") {
        return t("Ly damage {damage}; occupied slots {occupied}/{capacity}; Ly repair {repair}", {
            damage: formatTwoDecimals(cell.lysosomeDamageRate ?? 0),
            occupied: cell.lysosomeOccupiedSlots ?? 0,
            capacity: cell.lysosomeCapacity ?? 0,
            repair: formatTwoDecimals(cell.lysosomeRepairRate ?? 0),
        });
    }
    if (scope === "chloroplast") {
        return t("Photo damage {damage}; carotenoid protection {protection}; CP repair {repair}", {
            damage: formatTwoDecimals(cell.cpPhotoDamageRate ?? 0),
            protection: formatTwoDecimals(cell.carotProtection ?? 0),
            repair: formatTwoDecimals(cell.cpRepairRate ?? 0),
        });
    }
    if (scope === "membrane") {
        return t("Light transmittance {transmittance}; direct cell damage {damage}; melanin protection affects direct damage", {
            transmittance: formatTwoDecimals(cell.membraneLightTransmittance ?? 0),
            damage: formatTwoDecimals(cell.cellDamageRate ?? 0),
        });
    }
    if (scope === "cytosol") {
        return t("Repair capacity from cytosol mass; cell repair {repair}; repair energy {energy}", {
            repair: formatTwoDecimals(cell.cellRepairRate ?? 0),
            energy: formatTwoDecimals(cell.repairEnergyCostRate ?? 0),
        });
    }
    if (scope === "nucleus") {
        return t("Cell damage {damage}; cell damage rate {rate}; division blocked only by CellDivDamageMax", {
            damage: formatTwoDecimals(cell.cellDamage ?? 0),
            rate: formatTwoDecimals(cell.cellDamageRate ?? 0),
        });
    }
    return t("CP photo damage {cpDamage}; Ly damage {lyDamage}; organelle leaks contribute to cell damage {cellDamage}; repair cost {repair}", {
        cpDamage: formatTwoDecimals(cell.cpPhotoDamageRate ?? 0),
        lyDamage: formatTwoDecimals(cell.lysosomeDamageRate ?? 0),
        cellDamage: formatTwoDecimals(cell.cellDamageRate ?? 0),
        repair: formatTwoDecimals(cell.repairEnergyCostRate ?? 0),
    });
}

function energyRateComponents(cell, scope) {
    const repair = Math.max(0, cell.repairEnergyCostRate ?? 0);
    if (scope === "lysosome") {
        return t("Digestion gain {gain}; digestion cost {cost}; lysosome repair cost {repair}", {
            gain: formatTwoDecimals(cell.digestionEnergyProduction ?? 0),
            cost: formatTwoDecimals(cell.digestionEnergyCostRate ?? 0),
            repair: formatTwoDecimals(cell.lysosomeRepairEnergyCostRate ?? 0),
        });
    }
    if (scope === "chloroplast") {
        return t("Photosynthesis {photosynthesis}; chloroplast upkeep {upkeep}; CpDamage reduces capacity", {
            photosynthesis: formatTwoDecimals(cell.energyProduction ?? 0),
            upkeep: formatTwoDecimals(energyConsumptionFor(cell, scope)),
        });
    }
    if (scope === "membrane") {
        return t("Membrane upkeep {upkeep}; melanin increases opacity/protection and upkeep", {
            upkeep: formatTwoDecimals(energyConsumptionFor(cell, scope)),
        });
    }
    if (scope === "cytosol") {
        return t("Cytosol upkeep {upkeep}; GFP upkeep; repair energy {repair}", {
            upkeep: formatTwoDecimals(Math.max(0, energyConsumptionFor(cell, scope) - repair)),
            repair: formatTwoDecimals(repair),
        });
    }
    if (scope === "nucleus") {
        return t("Nucleoid upkeep {upkeep}; division impulse cost is paid during division", {
            upkeep: formatTwoDecimals(energyConsumptionFor(cell, scope)),
        });
    }
    return t("Photosynthesis {photosynthesis}; digestion {digestion}; base upkeep {upkeep}; repair energy {repair}", {
        photosynthesis: formatTwoDecimals(cell.energyProduction ?? 0),
        digestion: formatTwoDecimals(cell.digestionEnergyProduction ?? 0),
        upkeep: formatTwoDecimals(Math.max(0, (cell.energyConsumption ?? 0) - repair)),
        repair: formatTwoDecimals(repair),
    });
}

function damagePerformance(damage) {
    return Math.max(0, Math.min(1, Math.exp(-Math.max(0, Number(damage) || 0))));
}

function row(grid, label, value, tooltip) {
    const labelEl = document.createElement("div");
    labelEl.className = "cell-info-label";
    labelEl.textContent = t(label);
    const valueEl = document.createElement("div");
    grid.append(labelEl, valueEl);
    setTooltipValue(valueEl, t(String(value)), t(tooltip));
}

function clearGrid(grid) {
    clearTooltipElement(grid);
}

function syncScopeButtons(container, attrName, activeScope, options = {}) {
    if (!container) return;
    const lockOrganelles = Boolean(options.lockOrganelles);
    container.classList.toggle("info-scope-controls--organelles-locked", lockOrganelles);
    for (const button of container.querySelectorAll("button")) {
        const scope = button.getAttribute(attrName) ?? "general";
        const active = scope === activeScope;
        const disabled = lockOrganelles && scope !== "general";
        button.classList.toggle("active", active);
        button.classList.toggle("info-scope-btn--locked", disabled);
        button.disabled = disabled;
        button.setAttribute("aria-disabled", String(disabled));
        button.setAttribute("aria-pressed", String(active));
    }
}

const EVENT_TYPE_IMPULSE = "impulse";
export function getCollisionImpulseHistory(cell = getSelectedCell()) {
    return (cell?.events ?? []).filter(event => event.type === EVENT_TYPE_IMPULSE);
}

function getLastCollisionImpulse(cell) {
    const impulses = getCollisionImpulseHistory(cell);
    return impulses.length > 0 ? impulses[impulses.length - 1] : null;
}

function mapWorldCellToTemplate(cell) {
    return {
        id: null,
        name: null,
        genome: {
            divisionThreshold: cell.genome.divisionThreshold,
            divisionImpulse: cell.genome.divisionImpulse,
            divisionAngle: cell.genome.divisionAngle,
            maxEnergy: cell.genome.maxEnergy,
            dryMass: cell.genome.dryMass,
            elasticity: cell.genome.elasticity,
            gfp: cell.genome.gfp ?? 0,
            melaninEnabled: cell.genome.melaninEnabled,
            melaninPercent: cell.genome.melaninPercent ?? 0,
            chloroplastEnabled: cell.genome.chloroplastEnabled,
            chloroplastAmount: cell.genome.chloroplastAmount ?? 0,
            chlorophyll: cell.genome.chlorophyll ?? 0,
            carotenoids: cell.genome.carotenoids ?? 0,
            lysosomeEnabled: cell.genome.lysosomeEnabled,
            lysosomeAmount: cell.genome.lysosomeAmount ?? 0,
            lysosomeEnzymeActivity: cell.genome.lysosomeEnzymeActivity ?? 0,
            code: cell.genome.code,
        },
    };
}

function showCellContent(hasCell) {
    dom.selectedCellContent?.classList.toggle("hidden", !hasCell);
    dom.saveSelectedCellBtn?.classList.toggle("hidden", !hasCell);
}

function clearSelectedCellInfo() {
    dom.selectedInfoGrid?.replaceChildren();
    drawSelectedCellPreview(null, null);
}

function rgbaString(color) {
    if (!color) return "—";
    return `${Math.round(color.r ?? 0)}, ${Math.round(color.g ?? 0)}, ${Math.round(color.b ?? 0)} / ${formatTwoDecimals(color.opacity ?? 0)}`;
}










