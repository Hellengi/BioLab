import { dom } from "../dom.js";
import { formatTwoDecimals, getCellRgbString, setText } from "../../core/utils.js";
import { energyConsumptionFor, formatOrganelleEnergy } from "../../core/energy-info.js";
import { drawSelectedCellPreview } from "../../render/preview.js";
import { getActiveTab, getLastTab, setSelectedTabEnabled, switchTab } from "./_tabs.js";
import { getSelectedCell, setSelectedInfoScope, state } from "../../store/state.js";
import { clearTooltipElement, setTooltipPairValue, setTooltipValue } from "../cell-info.js";
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
    showCellContent(true);
    setSelectedTabEnabled(true);
    switchTab("selected");

    if (hasCellDetails(cell)) {
        updateSelectedCellPanel(cell);
        lastSelectionPanelRefreshMs = performance.now();
        lastSelectionPanelCellId = cell.id;
    } else {
        showSelectedCellDetailsPending(cell);
        lastSelectionPanelRefreshMs = 0;
        lastSelectionPanelCellId = cell.id;
    }

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
    if (!hasCellDetails(cell)) {
        if (force || cellChanged) {
            showSelectedCellDetailsPending(cell);
            lastSelectionPanelRefreshMs = now;
            lastSelectionPanelCellId = cell.id;
        }
        return;
    }
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

function hasCellDetails(cell) {
    return Boolean(cell?.genome);
}

function showSelectedCellDetailsPending(cell) {
    syncSelectedCellTitle(cell);
    state.selectedStrain = null;
    clearGrid(dom.selectedInfoGrid);
    if (dom.selectedInfoGrid) {
        row(dom.selectedInfoGrid, "Status", t("Loading cell details…"), "Detailed genome and diagnostic data are requested after selecting a cell");
    }
    drawSelectedCellPreview(cell, state.selectedStrain);
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
        row(grid, "Division threshold", `${formatTwoDecimals(genome.divisionThreshold)}%`, "Cell divides when stored energy reaches this percent of its current maximum energy");
        row(grid, "Division impulse", formatTwoDecimals(genome.divisionImpulse), "NcDivImpulseCost = NcDivImpulse² / (2 × CellMass)");
        row(grid, "Division angle", `${formatTwoDecimals(genome.divisionAngle ?? 0)}°`, "DivisionAxis = CellAngle + NcDivAngle");
        row(grid, "Nucleus damage", formatTwoDecimals(cell.nucleusDamage ?? 0), "NucleusDamage is independent organelle damage; it can block division when above CellDivDamageMax");
        row(grid, "Color / opacity", rgbaString(visual.nucleoidColor), "NucleusColor = mix(BaseNucleusColor, DamageColor, NucleusDamage)");
        return;
    }
    if (scope === "cytosol") {
        row(grid, "Cytosol density", formatTwoDecimals(genome.cytosolDensity), "CtMass = CtDensity × CtArea × CtDensityFactor + Energy × EnergyToMassFactor");
        row(grid, "Cytosol area", formatTwoDecimals(genome.cytosolArea), "MaxEnergy = CytosolArea × EnergyCapacityPerArea");
        row(grid, "Bioluminescence", `${genome.bioluminescenceEnabled ? t("on") : t("off")} / ${formatTwoDecimals(genome.bioluminescence ?? 0)}%`, "Bioluminescence is an optional cytosol parameter; when disabled its expression and cost are zero");
        row(grid, "Cytosol damage", formatTwoDecimals(cell.cellDamage ?? 0), "CytosolDamage is the main lethal damage channel");
        row(grid, "Cytosol color / opacity", rgbaString(visual.cytosolColor), "CytosolColor = weighted(BaseCytosolColor, Nucleus/Chloroplast/Lysosome influence, CytosolDamage); membrane color is not included");
        return;
    }
    if (scope === "membrane") {
        row(grid, "Elasticity", formatTwoDecimals(genome.elasticity), "Restitution = baseRestitution × √(elasticity₁ × elasticity₂)");
        row(grid, "Melanin", `${genome.melaninEnabled ? t("on") : t("off")} / ${formatTwoDecimals(genome.melaninPercent ?? 0)}%`, "MembraneOpacity = BaseOpacity + MelaninOpacityFactor × MelaninPercent");
        row(grid, "Light transmittance", formatTwoDecimals(cell.membraneLightTransmittance ?? 0), "MembraneLightTransmittance = exp(−MembraneOpacity)");
        row(grid, "Membrane damage", formatTwoDecimals(cell.membraneDamage ?? 0), "MembraneDamage comes from explicit, initial or inherited state and is repaired as an external surface organelle");
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

    if (scope === "flagellum") {
        const count = Boolean(genome.flagellumEnabled) ? Math.max(1, Math.min(2, Math.round(genome.flagellumCount ?? cell.flagellumCapacity ?? 1))) : 0;
        row(grid, "Enabled", t(String(Boolean(genome.flagellumEnabled))), "FlagellumEnabled controls the presence of flagella");
        row(grid, "Count", String(count), "Flagella use a discrete morphology: absent, one flagellum, or a symmetric pair");
        row(grid, "Length", `${formatTwoDecimals(genome.flagellumLength ?? 0)} × R`, "ActualLength = CellRadius × Length; length affects reach, hydrodynamic coupling, torque, cost and visual extent");
        row(grid, "Motor power", `${formatTwoDecimals(genome.flagellumMotorPower ?? 0)}%`, "Base motility activity; actual performance also depends on energy, viscosity, alive state and damage");
        row(grid, "Placement", "Posterior", "Flagella are fixed as rear pushers");
        row(grid, "Pair spread angle", count >= 2 ? `${Math.round(Number(genome.flagellumPairSpreadAngle ?? 0) || 0)}°` : "inactive for single flagellum", "Only paired flagella use PairSpread; root thickness is included automatically so 0 means the bases just touch and the maximum value still keeps the roots inside the membrane");
        row(grid, "Steering asymmetry", `${Math.round(Number(genome.flagellumSteeringAsymmetry ?? 0) || 0)}%`, "One flagellum bends thrust; two flagella bias left/right motor power");
        row(grid, "Flagellum damage", formatTwoDecimals(cell.flagellumDamage ?? 0), "Average damage across active flagella; a critically damaged flagellum remains visible but produces no thrust");
        row(grid, "Color / opacity", rgbaString(visual.flagellumColor), "FlagellumColor follows membrane color; activity changes motion/shape and damage dulls/breaks the tail");
        return;
    }

    if (scope === "lysosome") {
        row(grid, "Enabled", t(String(Boolean(genome.lysosomeEnabled))), "LysosomeEnabled controls food capture and digestion");
        row(grid, "Amount", formatTwoDecimals(genome.lysosomeAmount ?? 0), "LysosomeCapacity = LysosomeAmount; one food piece per lysosome");
        row(grid, "Enzyme activity", `${formatTwoDecimals(genome.lysosomeEnzymeActivity ?? 0)}%`, "Higher activity digests faster, but increases energy cost");
        row(grid, "Food slots", `${cell.lysosomeOccupiedSlots ?? 0} / ${cell.lysosomeCapacity ?? 0}`, "Captured food occupies a lysosome slot immediately on contact");
        row(grid, "Lysosome damage", formatTwoDecimals(cell.lysosomeDamage ?? 0), "Average damage across lysosome vesicles");
        row(grid, "Color / opacity", rgbaString(visual.lysosomeColor), "LysosomeColor = acidic vesicle color mixed with damage");
        return;
    }

    row(grid, "Status", cell.dead ? t("Dead") : t("Alive"), "Dead cells can be inspected like living cells until they decay");
    row(grid, "Code", genome.code ?? "", "Genome code");
    rowPair(
        grid,
        "Energy",
        formatTwoDecimals(cell.energy ?? 0),
        "CurrentEnergy = stored reserve after production, consumption, repair and digestion costs",
        formatTwoDecimals(maxEnergyForCell(cell)),
        "MaxEnergy = CytosolArea × EnergyCapacityPerArea"
    );
    rowPair(
        grid,
        "Mass",
        formatTwoDecimals(cell.mass ?? 0),
        "CurrentMass = DryMass + EnergyMass; runtime physics uses this value",
        formatTwoDecimals(dryMassForCell(cell)),
        "DryMass = structural organelle mass without stored-energy mass"
    );
    row(grid, "Radius", formatTwoDecimals(cell.radius), "CellRadius = sqrt(CellArea / π)");
    row(grid, "Area", formatTwoDecimals(Math.PI * (cell.radius ?? 0) * (cell.radius ?? 0)), "CellArea = π × CellRadius²");
    row(grid, "Density", formatTwoDecimals(cell.density), "CellDensity = CellMass / CellArea");
    row(grid, "Elasticity", formatTwoDecimals(genome.elasticity), "MembraneElasticity participates in collision restitution");
    row(grid, "Nucleus damage", formatTwoDecimals(cell.nucleusDamage ?? 0), "NucleusDamage is independent and can block division");
    row(grid, "Cytosol damage", formatTwoDecimals(cell.cellDamage ?? 0), "CytosolDamage carries whole-cell consequences: leakage accumulation and death at threshold");
    row(grid, "Membrane damage", formatTwoDecimals(cell.membraneDamage ?? 0), "MembraneDamage comes from explicit, initial or inherited state");
    row(grid, "Cp damage", formatTwoDecimals(cell.cpDamage ?? 0), "CpDamage bleaches chloroplasts; without chloroplasts it does not tint the cell");
    row(grid, "Lysosome damage", formatTwoDecimals(cell.lysosomeDamage ?? 0), "Damaged lysosomes digest worse and can leak into CytosolDamage");
    row(grid, "Flagellum damage", formatTwoDecimals(cell.flagellumDamage ?? 0), "Damaged flagella lose thrust but stay visible");
    row(grid, "Food slots", `${cell.lysosomeOccupiedSlots ?? 0} / ${cell.lysosomeCapacity ?? 0}`, "Lysosomes are required for food contact, capture and digestion");
}

function renderForcesInfo(grid, cell) {
    const m = cell.motion ?? {};
    row(grid, "Speed", formatTwoDecimals(m.speed ?? 0), "Speed = sqrt(vx² + vy²)");
    row(grid, "Angular velocity", formatTwoDecimals(m.angularVelocity ?? cell.angularVelocity ?? 0), "ω is angular velocity; shown as a white dashed tangential arrow");
    row(grid, "Gravity/buoyancy", formatTwoDecimals(m.gravForce ?? 0), "Fgrav/buoy = mass × gravity × (density − fluidDensity) / density");
    row(grid, "Translational drag", formatTwoDecimals(m.dragForce ?? 0), "Fdrag = 6π × viscosity × radius × speed");
    row(grid, "Total force", formatTwoDecimals(m.totalForce ?? 0), "ΣF = flagella force + gravity/buoyancy + translational drag");
    row(grid, "Rotational drag torque", formatTwoDecimals(m.rotationalDragTorque ?? 0), "τdrag = −4π × viscosity × radius² × ω");
    row(grid, "Flagellum torque", formatTwoDecimals(m.flagellumTorque ?? 0), "Στflagella = Σ(rᵢ × Fᵢ), signed sum of torque from all flagella");
    row(grid, "Total rotational torque", formatTwoDecimals(m.totalRotationalTorque ?? 0), "Στ = Στflagella + τdrag");
    row(grid, "Flagellum force", formatTwoDecimals(m.flagellumForce ?? 0), "Displayed as full force arrows from each flagellum base in the direction the flagellum pushes");
    const impulse = getLastCollisionImpulse(cell);
    row(grid, "Collision impulse", impulse ? formatTwoDecimals(Math.abs(impulse.impulse ?? 0)) : "0.00", "impulse = −(1 + restitution) × vnormal / (1/mass₁ + 1/mass₂)");
    row(grid, "Illumination", formatTwoDecimals((cell.localLight ?? 0) * 100), "Irradiance = globalLight + local sources attenuated by optical density");
}

function renderHealthInfo(grid, cell, scope) {
    if (scope === "general") {
        row(grid, "Energy supply", `${Math.round(energySupply01(cell) * 100)}%`, "EnergySupply = ActualBasalSupply / BasalDemand; below LowEnergyThreshold% of MaxEnergy the reserve contribution fades by an exponential curve; at 0 only current production is distributed");
        row(grid, "Energy reserve", formatTwoDecimals(cell.energy ?? 0), "LowEnergyThreshold is now a percent of current MaxEnergy, not an absolute energy value");
        row(grid, "Energy demand", formatTwoDecimals(cell.energyDemand ?? 0), "BasalDemand = sum of current organelle base consumption before repair");
        row(grid, "Actual basal supply", formatTwoDecimals((cell.energyDemand ?? 0) * energySupply01(cell)), "ActualBasalSupply = BasalDemand × EnergySupply; organelle consumption proportions are preserved under shortage");
        row(grid, "Performance inputs", performanceInputsSummary(cell), "Performance is derived from EnergySupply plus organelle damage; flagella also include MotorPower and per-slot damage");
        row(grid, "Nucleus performance", `${Math.round(damagePerformance(cell.nucleusDamage ?? 0) * energySupply01(cell) * 100)}%`, "NucleusPerformance = exp(−NucleusDamage) × EnergySupply");
        row(grid, "Cytosol performance", `${Math.round(damagePerformance(cell.cellDamage ?? 0) * energySupply01(cell) * 100)}%`, "CytosolPerformance = exp(−CytosolDamage) × EnergySupply; CytosolDamage reaching 1.0 kills the cell");
        row(grid, "Membrane performance", `${Math.round(damagePerformance(cell.membraneDamage ?? 0) * energySupply01(cell) * 100)}%`, "MembranePerformance = exp(−MembraneDamage) × EnergySupply");
        row(grid, "Chloroplast performance", `${Math.round(damagePerformance(cell.cpDamage ?? 0) * energySupply01(cell) * 100)}%`, "CpPerformance = exp(−CpDamage) × EnergySupply; damage reduces PhotosynthesisCapacity first");
        row(grid, "Lysosome performance", formatOrganelleHealth(cell, "lysosome", "performance"), "LysosomePerformance is shown as a range when individual slots exist");
        row(grid, "Flagellum performance", formatOrganelleHealth(cell, "flagellum", "performance"), "FlagellumPerformance = MotorPower × exp(−SlotDamage) × EnergySupply; shown as min ~ max across active tails");
        row(grid, "Nucleus damage", formatTwoDecimals(cell.nucleusDamage ?? 0), "NucleusDamage is repaired independently and can block division");
        row(grid, "Cytosol damage", formatTwoDecimals(cell.cellDamage ?? 0), "CytosolDamage is the main lethal damage channel");
        row(grid, "Membrane damage", formatTwoDecimals(cell.membraneDamage ?? 0), "MembraneDamage comes from explicit, initial or inherited state; collisions do not add membrane damage");
        row(grid, "Cp damage", formatTwoDecimals(cell.cpDamage ?? 0), "CpDamage does not block division directly; high CpDamage leaks into CytosolDamage");
        row(grid, "Lysosome damage", formatOrganelleHealth(cell, "lysosome", "damage"), "High lysosome damage leaks into CytosolDamage and lowers digestion performance");
        row(grid, "Flagellum damage", formatOrganelleHealth(cell, "flagellum", "damage"), "FlagellumDamage is shown as min ~ max across active external tails");
        row(grid, "Nucleus damage rate", formatTwoDecimals(cell.nucleusDamageRate ?? 0), "NucleusDamageRate = direct internal photo-stress after membrane pigment protection");
        row(grid, "Cytosol damage rate", formatTwoDecimals(cell.cellDamageRate ?? 0), "CytosolDamageRate = DirectPhotoDamage + EnergyDeficitDamage + OrganelleLeakDamage");
        row(grid, "Membrane damage rate", formatTwoDecimals(cell.membraneDamageRate ?? 0), "Incoming membrane damage before repair; collisions are ignored");
        row(grid, "Cp damage rate", formatTwoDecimals(cell.cpPhotoDamageRate ?? 0), "CpPhotoDamageRate = PhotoStress² × CpPhotoDamageFactor × (1 − CarotProtection)");
        row(grid, "Lysosome damage rate", formatTwoDecimals(cell.lysosomeDamageRate ?? 0), "LyDamageRate reports explicit lysosome damage sources; active digestion no longer damages lysosomes");
        row(grid, "Flagellum damage rate", formatTwoDecimals(cell.flagellumDamageRate ?? 0), "FlagellumDamageRate currently reports explicit/initial damage sources; collisions and motor workload do not damage flagella");
        row(grid, "Nucleus repair rate", formatTwoDecimals(cell.nucleusRepairRate ?? 0), "NucleusRepairRate is limited by RepairCapacity and available energy");
        row(grid, "Cytosol repair rate", formatTwoDecimals(cell.cellRepairRate ?? 0), "CytosolRepairRate is limited by RepairCapacity and available energy");
        row(grid, "Membrane repair rate", formatTwoDecimals(cell.membraneRepairRate ?? 0), "MembraneRepairRate consumes energy to restore boundary integrity");
        row(grid, "Cp repair rate", formatTwoDecimals(cell.cpRepairRate ?? 0), "CpRepairRate is repaired before global CytosolDamage repair");
        row(grid, "Lysosome repair rate", formatTwoDecimals(cell.lysosomeRepairRate ?? 0), "LyRepairRate consumes energy to stabilize lysosome membranes");
        row(grid, "Flagellum repair rate", formatTwoDecimals(cell.flagellumRepairRate ?? 0), "FlagellumRepairRate consumes energy to restore external tails");
        row(grid, "Rate components", healthRateComponents(cell, scope), "Concrete rates used this tick; repair subtracts from accumulated damage");
        return;
    }

    const lysosome = scope === "lysosome";
    const cp = scope === "chloroplast";
    const flagellum = scope === "flagellum";
    const membrane = scope === "membrane";
    const nucleus = scope === "nucleus";
    const damage = nucleus ? cell.nucleusDamage ?? 0 : (lysosome ? cell.lysosomeDamage ?? 0 : (cp ? cell.cpDamage ?? 0 : (flagellum ? cell.flagellumDamage ?? 0 : (membrane ? cell.membraneDamage ?? 0 : cell.cellDamage ?? 0))));
    const damageRate = nucleus ? cell.nucleusDamageRate ?? 0 : (lysosome ? cell.lysosomeDamageRate ?? 0 : (cp ? cell.cpPhotoDamageRate ?? 0 : (flagellum ? cell.flagellumDamageRate ?? 0 : (membrane ? cell.membraneDamageRate ?? 0 : cell.cellDamageRate ?? 0))));
    const repairRate = nucleus ? cell.nucleusRepairRate ?? 0 : (lysosome ? cell.lysosomeRepairRate ?? 0 : (cp ? cell.cpRepairRate ?? 0 : (flagellum ? cell.flagellumRepairRate ?? 0 : (membrane ? cell.membraneRepairRate ?? 0 : cell.cellRepairRate ?? 0))));
    const performanceTooltip = flagellum
        ? "FlagellumPerformance = MotorActivity × exp(−SlotDamage) × EnergySupply; lowers thrust"
        : membrane
            ? "MembranePerformance = exp(−MembraneDamage) × EnergySupply"
            : lysosome
                ? "LyPerformance = exp(−LyDamage) × EnergySupply; lowers digestion speed"
                : cp
                    ? "CpPerformance = exp(−CpDamage) × EnergySupply; lowers photosynthesis capacity"
                    : nucleus
                        ? "NucleusPerformance = exp(−NucleusDamage) × EnergySupply; high damage blocks division"
                        : "CytosolPerformance = exp(−CytosolDamage) × EnergySupply; can kill the cell";
    const damageTooltip = flagellum
        ? "FlagellumDamage comes from explicit/initial/inherited sources and is reduced by repair"
        : membrane
            ? "MembraneDamage comes from explicit, initial or inherited state"
            : lysosome
                ? "LyDamage comes from explicit/initial/inherited sources; active digestion no longer adds damage"
                : cp
                    ? "CpDamage accumulates from excess photochemical light"
                    : nucleus
                        ? "NucleusDamage accumulates from direct internal stress"
                        : "CytosolDamage accumulates from direct stress, low energy and organelle leakage";
    const damageRateTooltip = flagellum
        ? "Incoming flagellum damage before repair"
        : membrane
            ? "Incoming membrane damage before repair; collisions are ignored"
            : lysosome
                ? "Incoming lysosome damage before repair"
                : cp
                    ? "Incoming Cp damage before repair"
                    : nucleus
                        ? "Incoming NucleusDamage before repair"
                        : "Incoming CytosolDamage before repair";
    const repairTooltip = flagellum
        ? "FlagellumRepairRate = repaired tail damage per tick"
        : membrane
            ? "MembraneRepairRate = repaired membrane damage per tick"
            : lysosome
                ? "LyRepairRate = repaired lysosome damage per tick"
                : cp
                    ? "CpRepairRate = repaired CpDamage per tick"
                    : nucleus
                        ? "NucleusRepairRate = repaired NucleusDamage per tick"
                        : "CytosolRepairRate = repaired CytosolDamage per tick";

    row(grid, "Energy supply", `${Math.round(energySupply01(cell) * 100)}%`, "EnergySupply is shared by all organelles as the same fraction of their base demand");
    row(grid, "Energy reserve", formatTwoDecimals(cell.energy ?? 0), "Below LowEnergyThreshold% of MaxEnergy, actual basal supply fades smoothly before the reserve reaches zero");
    row(grid, "Performance inputs", performanceInputsForScope(cell, scope), "This lists the concrete values used by the Performance row");
    row(grid, "Performance", formatOrganelleHealth(cell, scope, "performance", damage), performanceTooltip);
    row(grid, "Damage", formatOrganelleHealth(cell, scope, "damage", damage), damageTooltip);
    row(grid, "Damage rate", formatOrganelleHealth(cell, scope, "damageRate", damageRate), damageRateTooltip);
    row(grid, "Repair rate", formatOrganelleHealth(cell, scope, "repairRate", repairRate), repairTooltip);
    row(grid, "Rate components", healthRateComponents(cell, scope), "Concrete damage and repair factors for this scope");
}

function renderEnergyInfo(grid, cell, scope) {
    row(grid, "Production", formatOrganelleEnergy(cell, scope, "production"), "Production is localized in chloroplasts or lysosomes depending on scope");
    row(grid, "Consumption", formatOrganelleEnergy(cell, scope, "consumption"), "Consumption already includes repair energy cost when repair is active");
    row(grid, "Rate components", energyRateComponents(cell, scope), "Concrete production and consumption factors for this scope");
}

function performanceInputsSummary(cell) {
    const supply = Math.round(energySupply01(cell) * 100);
    return t("Supply {supply}%; damage: N {nucleus}, C {cytosol}, M {membrane}, CP {cp}, Ly {ly}, Fl {fl}; flagella motor {motor}%", {
        supply,
        nucleus: formatTwoDecimals(cell.nucleusDamage ?? 0),
        cytosol: formatTwoDecimals(cell.cellDamage ?? 0),
        membrane: formatTwoDecimals(cell.membraneDamage ?? 0),
        cp: formatTwoDecimals(cell.cpDamage ?? 0),
        ly: formatOrganelleHealth(cell, "lysosome", "damage"),
        fl: formatOrganelleHealth(cell, "flagellum", "damage"),
        motor: flagellumMotorRange(cell),
    });
}

function performanceInputsForScope(cell, scope) {
    const supply = Math.round(energySupply01(cell) * 100);
    if (scope === "flagellum") {
        return t("Supply {supply}%; motor {motor}%; slot damage {damage}", {
            supply,
            motor: flagellumMotorRange(cell),
            damage: formatOrganelleHealth(cell, "flagellum", "damage"),
        });
    }
    if (scope === "lysosome") {
        return t("Supply {supply}%; slot damage {damage}; occupied {occupied}/{capacity}", {
            supply,
            damage: formatOrganelleHealth(cell, "lysosome", "damage"),
            occupied: cell.lysosomeOccupiedSlots ?? 0,
            capacity: cell.lysosomeCapacity ?? 0,
        });
    }
    return t("Supply {supply}%; damage {damage}", {
        supply,
        damage: formatTwoDecimals(organelleDamage(cell, scope)),
    });
}

function flagellumMotorRange(cell) {
    const values = organelleSlots(cell, "flagellum")
        .map(slot => Number(slot.motorPower ?? NaN))
        .filter(Number.isFinite);
    if (!values.length) return "0";
    const min = Math.round(Math.min(...values));
    const max = Math.round(Math.max(...values));
    return min === max ? String(min) : `${min} ~ ${max}`;
}

function formatOrganelleHealth(cell, scope, metric, fallback = null) {
    const values = organelleHealthValues(cell, scope, metric);
    if (values.length > 0) {
        if (metric === "performance") return formatPercentRange(values);
        return formatNumberRange(values);
    }
    if (metric === "performance") return `${Math.round(damagePerformance(fallback ?? organelleDamage(cell, scope)) * energySupply01(cell) * 100)}%`;
    return formatTwoDecimals(fallback ?? organelleDamage(cell, scope));
}

function organelleHealthValues(cell, scope, metric) {
    const slots = organelleSlots(cell, scope);
    if (!slots.length) return [];
    const values = slots.map(slot => {
        if (metric === "performance") {
            const value = Number(slot.performance ?? damagePerformance(slot.damage));
            return value * energySupply01(cell);
        }
        if (metric === "damage") return Number(slot.damage ?? 0);
        if (metric === "damageRate") return Number(slot.damageRate ?? 0);
        if (metric === "repairRate") return Number(slot.repairRate ?? 0);
        return NaN;
    }).filter(Number.isFinite);
    return values.length > 1 ? values : values;
}

function organelleSlots(cell, scope) {
    if (scope === "flagellum") return Array.isArray(cell?.flagellumSlots) ? cell.flagellumSlots : [];
    if (scope === "lysosome") return Array.isArray(cell?.lysosomeSlots) ? cell.lysosomeSlots : [];
    return [];
}

function organelleDamage(cell, scope) {
    if (scope === "flagellum") return cell.flagellumDamage ?? 0;
    if (scope === "lysosome") return cell.lysosomeDamage ?? 0;
    if (scope === "chloroplast") return cell.cpDamage ?? 0;
    if (scope === "membrane") return cell.membraneDamage ?? 0;
    if (scope === "nucleus") return cell.nucleusDamage ?? 0;
    return cell.cellDamage ?? 0;
}

function energySupply01(cell) {
    return Math.max(0, Math.min(1, Number(cell?.energyAvailability ?? 1) || 0));
}

function formatPercentRange(values) {
    const normalized = values.map(value => Math.max(0, Math.min(1, Number(value) || 0)) * 100);
    if (!normalized.length) return "0%";
    const min = Math.round(Math.min(...normalized));
    const max = Math.round(Math.max(...normalized));
    return min === max ? `${min}%` : `${min}% ~ ${max}%`;
}

function formatNumberRange(values) {
    if (!values.length) return "0.00";
    const min = Math.min(...values);
    const max = Math.max(...values);
    return Math.abs(min - max) < 1.0e-9 ? formatTwoDecimals(min) : `${formatTwoDecimals(min)} ~ ${formatTwoDecimals(max)}`;
}

function healthRateComponents(cell, scope) {
    if (scope === "flagellum") {
        return t("Flagellum damage {damage}; flagella {count}/2; flagella repair {repair}", {
            damage: formatTwoDecimals(cell.flagellumDamageRate ?? 0),
            count: cell.flagellumCapacity ?? 0,
            repair: formatTwoDecimals(cell.flagellumRepairRate ?? 0),
        });
    }
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
        return t("Membrane repair {repair}; light transmittance {transmittance}; collisions do not damage membrane", {
            repair: formatTwoDecimals(cell.membraneRepairRate ?? 0),
            transmittance: formatTwoDecimals(cell.membraneLightTransmittance ?? 0),
        });
    }
    if (scope === "cytosol") {
        return t("Repair capacity from cytosol mass; cell repair {repair}; repair energy {energy}", {
            repair: formatTwoDecimals(cell.cellRepairRate ?? 0),
            energy: formatTwoDecimals(cell.repairEnergyCostRate ?? 0),
        });
    }
    if (scope === "nucleus") {
        return t("Nucleus damage {damage}; nucleus damage rate {rate}; repair {repair}; division blocked above CellDivDamageMax", {
            damage: formatTwoDecimals(cell.nucleusDamage ?? 0),
            rate: formatTwoDecimals(cell.nucleusDamageRate ?? 0),
            repair: formatTwoDecimals(cell.nucleusRepairRate ?? 0),
        });
    }
    return t("CP photo {cpDamage}; Ly {lyDamage}; membrane {mbDamage}; flagellum {flDamage}; cytosol {cellDamage}; repair cost {repair}", {
        cpDamage: formatTwoDecimals(cell.cpPhotoDamageRate ?? 0),
        lyDamage: formatTwoDecimals(cell.lysosomeDamageRate ?? 0),
        mbDamage: formatTwoDecimals(cell.membraneDamageRate ?? 0),
        flDamage: formatTwoDecimals(cell.flagellumDamageRate ?? 0),
        cellDamage: formatTwoDecimals(cell.cellDamageRate ?? 0),
        repair: formatTwoDecimals(cell.repairEnergyCostRate ?? 0),
    });
}

function energyRateComponents(cell, scope) {
    const repair = Math.max(0, cell.repairEnergyCostRate ?? 0);
    if (scope === "flagellum") {
        return t("Motion cost {motion}; flagellum repair cost {repair}; shared energy supply {supply}%", {
            motion: formatTwoDecimals(cell.flagellumEnergyCostRate ?? 0),
            repair: formatTwoDecimals(cell.flagellumRepairEnergyCostRate ?? 0),
            supply: Math.round(energySupply01(cell) * 100),
        });
    }
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
        return t("Membrane upkeep {upkeep}; membrane repair cost {repair}; melanin increases opacity/protection", {
            upkeep: formatTwoDecimals(Math.max(0, energyConsumptionFor(cell, scope) - (cell.membraneRepairEnergyCostRate ?? 0))),
            repair: formatTwoDecimals(cell.membraneRepairEnergyCostRate ?? 0),
        });
    }
    if (scope === "cytosol") {
        return t("Cytosol upkeep {upkeep}; Bioluminescence upkeep; repair energy {repair}", {
            upkeep: formatTwoDecimals(Math.max(0, energyConsumptionFor(cell, scope) - repair)),
            repair: formatTwoDecimals(repair),
        });
    }
    if (scope === "nucleus") {
        return t("Nucleoid upkeep {upkeep}; division impulse cost is paid during division", {
            upkeep: formatTwoDecimals(energyConsumptionFor(cell, scope)),
        });
    }
    return t("Photosynthesis {photosynthesis}; digestion {digestion}; base upkeep {upkeep}; flagella motion {flagella}; repair energy {repair}; shared energy supply {supply}%", {
        photosynthesis: formatTwoDecimals(cell.energyProduction ?? 0),
        digestion: formatTwoDecimals(cell.digestionEnergyProduction ?? 0),
        upkeep: formatTwoDecimals(Math.max(0, (cell.energyConsumption ?? 0) - repair - (cell.flagellumEnergyCostRate ?? 0))),
        flagella: formatTwoDecimals(cell.flagellumEnergyCostRate ?? 0),
        repair: formatTwoDecimals(repair),
        supply: Math.round(energySupply01(cell) * 100),
    });
}

function damagePerformance(damage) {
    return Math.max(0, Math.min(1, Math.exp(-Math.max(0, Number(damage) || 0))));
}

function maxEnergyForCell(cell) {
    const backend = Number(cell?.maxEnergy);
    if (Number.isFinite(backend) && backend >= 0) return backend;
    return Math.max(0, Number(cell?.genome?.cytosolArea ?? 0) || 0) * 0.72;
}

function dryMassForCell(cell) {
    const backend = Number(cell?.dryMass);
    if (Number.isFinite(backend) && backend >= 0) return backend;
    const mass = Number(cell?.mass ?? 0) || 0;
    return Math.max(0, mass);
}

function rowPair(grid, label, leftValue, leftTooltip, rightValue, rightTooltip) {
    const labelEl = document.createElement("div");
    labelEl.className = "cell-info-label";
    labelEl.textContent = t(label);
    const valueEl = document.createElement("div");
    grid.append(labelEl, valueEl);
    setTooltipPairValue(valueEl, t(String(leftValue)), t(leftTooltip), t(String(rightValue)), t(rightTooltip));
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
    if (!hasCellDetails(cell)) return null;

    return {
        id: null,
        name: null,
        genome: {
            divisionThreshold: cell.genome.divisionThreshold,
            divisionImpulse: cell.genome.divisionImpulse,
            divisionAngle: cell.genome.divisionAngle,
            cytosolArea: cell.genome.cytosolArea,
            cytosolDensity: cell.genome.cytosolDensity,
            bioluminescenceEnabled: Boolean(cell.genome.bioluminescenceEnabled),
            bioluminescence: cell.genome.bioluminescence ?? 0,
            elasticity: cell.genome.elasticity,
            melaninEnabled: cell.genome.melaninEnabled,
            melaninPercent: cell.genome.melaninPercent ?? 0,
            chloroplastEnabled: cell.genome.chloroplastEnabled,
            chloroplastAmount: cell.genome.chloroplastAmount ?? 0,
            chlorophyll: cell.genome.chlorophyll ?? 0,
            carotenoids: cell.genome.carotenoids ?? 0,
            lysosomeEnabled: cell.genome.lysosomeEnabled,
            lysosomeAmount: cell.genome.lysosomeAmount ?? 0,
            lysosomeEnzymeActivity: cell.genome.lysosomeEnzymeActivity ?? 0,
            flagellumEnabled: cell.genome.flagellumEnabled,
            flagellumCount: cell.genome.flagellumCount ?? 1,
            flagellumLength: cell.genome.flagellumLength ?? 0,
            flagellumMotorPower: cell.genome.flagellumMotorPower ?? 0,
            flagellumPairSpreadAngle: cell.genome.flagellumPairSpreadAngle ?? 36,
            flagellumSteeringAsymmetry: cell.genome.flagellumSteeringAsymmetry ?? 0,
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

function flagellumAverageMotor(genome = {}) {
    if (!genome.flagellumEnabled) return 0;
    return Number(genome.flagellumMotorPower ?? 0) || 0;
}

function rgbaString(color) {
    if (!color) return "—";
    return `${Math.round(color.r ?? 0)}, ${Math.round(color.g ?? 0)}, ${Math.round(color.b ?? 0)} / ${formatTwoDecimals(color.opacity ?? 0)}`;
}



