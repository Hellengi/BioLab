
import { cssVar } from "../../core/utils.js";
import { setCreateInfoScope } from "../../store/state.js";

let _activeOrganellePanel = null;
let _organellePanelsInitialized = false;
let _flagellumSubscope = "general";
const _panelHideTimers = new Map();

export let chloroplastEnabled = false;
export let lysosomeEnabled = false;
export let flagellumEnabled = false;
export let flagellumCount = 1;
export let melaninEnabled = false;
export let gfpEnabled = false;

export function setChloroplastEnabled(value) {
    chloroplastEnabled = Boolean(value);
    _syncChloroplastUi();
}

export function setLysosomeEnabled(value) {
    lysosomeEnabled = Boolean(value);
    _syncLysosomeUi();
}

export function setFlagellumEnabled(value, count = flagellumCount) {
    flagellumEnabled = Boolean(value);
    if (flagellumEnabled) flagellumCount = _normalizeFlagellumCount(count);
    _syncFlagellumUi();
}

export function setFlagellumMode(mode) {
    const normalized = String(mode ?? "off").toLowerCase();
    if (normalized === "pair" || normalized === "two" || normalized === "2") {
        flagellumEnabled = true;
        flagellumCount = 2;
    } else if (normalized === "single" || normalized === "one" || normalized === "1") {
        flagellumEnabled = true;
        flagellumCount = 1;
    } else {
        flagellumEnabled = false;
    }
    _syncFlagellumUi();
}

export function setMelaninEnabled(value) {
    melaninEnabled = Boolean(value);
    _syncMelaninUi();
}

export function setGfpEnabled(value) {
    gfpEnabled = Boolean(value);
    _syncGfpUi();
}

export function initOrganellePanels(onToggle) {
    if (_organellePanelsInitialized) return;

    const hostReady = _setupHost();
    if (!hostReady) return;

    _bindOrganelleButtons();
    _bindChloroplastToggle(onToggle);
    _bindLysosomeToggle(onToggle);
    _bindFlagellumToggle(onToggle);
    _bindMelaninToggle(onToggle);
    _bindGfpToggle(onToggle);
    _bindFlagellumSubscopeButtons();

    _organellePanelsInitialized = true;
}

function _setupHost() {
    const host = document.getElementById("organellePanelHost");
    if (!host) {
        console.warn("organellePanelHost not found");
        return false;
    }

    for (const id of ["nucleus", "cytosol", "membrane", "chloroplast", "lysosome", "flagellum"]) {
        const panel = document.getElementById(`organellePanel${_cap(id)}`);
        if (panel && panel.parentElement !== host) host.appendChild(panel);
    }
    return true;
}

function _bindOrganelleButtons() {
    document.querySelectorAll(".organelle-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const id = btn.dataset.organelle;
            if (id) _toggleOrganellePanel(id);
        });
    });
}

function _bindChloroplastToggle(onToggle) {
    const buttons = Array.from(document.querySelectorAll("[data-chloroplast-state]"));
    if (!buttons.length) return;

    _syncChloroplastUi();
    buttons.forEach(button => button.addEventListener("click", e => {
        e.stopPropagation();
        setChloroplastEnabled(String(button.dataset.chloroplastState || "off").toLowerCase() === "on");

        if (_activeOrganellePanel && _activeOrganellePanel !== "chloroplast") {
            _closeOrganellePanel(_activeOrganellePanel);
        }
        _openOrganellePanel("chloroplast");

        onToggle?.();
    }));
}

function _bindLysosomeToggle(onToggle) {
    const buttons = Array.from(document.querySelectorAll("[data-lysosome-state]"));
    if (!buttons.length) return;

    _syncLysosomeUi();
    buttons.forEach(button => button.addEventListener("click", e => {
        e.stopPropagation();
        setLysosomeEnabled(String(button.dataset.lysosomeState || "off").toLowerCase() === "on");

        if (_activeOrganellePanel && _activeOrganellePanel !== "lysosome") {
            _closeOrganellePanel(_activeOrganellePanel);
        }
        _openOrganellePanel("lysosome");

        onToggle?.();
    }));
}

function _bindFlagellumToggle(onToggle) {
    const buttons = Array.from(document.querySelectorAll("[data-flagellum-mode]"));
    if (!buttons.length) return;

    _syncFlagellumUi();
    buttons.forEach(button => button.addEventListener("click", e => {
        e.stopPropagation();
        setFlagellumMode(button.dataset.flagellumMode || "off");

        if (_activeOrganellePanel && _activeOrganellePanel !== "flagellum") {
            _closeOrganellePanel(_activeOrganellePanel);
        }
        _openOrganellePanel("flagellum");

        onToggle?.("flagellumMode");
    }));
}

function _bindMelaninToggle(onToggle) {
    const cb = document.getElementById("melaninEnabled");
    if (!cb) return;

    _syncMelaninUi();
    cb.addEventListener("change", () => {
        setMelaninEnabled(cb.checked);
        onToggle?.();
    });
}

function _bindGfpToggle(onToggle) {
    const cb = document.getElementById("gfpEnabled");
    if (!cb) return;

    _syncGfpUi();
    cb.addEventListener("change", () => {
        setGfpEnabled(cb.checked);
        onToggle?.();
    });
}

function _syncChloroplastUi() {
    const btn = document.getElementById("organelleBtnChloroplast");
    btn?.classList.toggle("organelle-disabled", !chloroplastEnabled);
    _syncStateButtons("[data-chloroplast-state]", chloroplastEnabled ? "on" : "off", "chloroplastState");
}

function _syncLysosomeUi() {
    const btn = document.getElementById("organelleBtnLysosome");
    btn?.classList.toggle("organelle-disabled", !lysosomeEnabled);
    _syncStateButtons("[data-lysosome-state]", lysosomeEnabled ? "on" : "off", "lysosomeState");
}

function _syncFlagellumUi() {
    const btn = document.getElementById("organelleBtnFlagellum");
    btn?.classList.toggle("organelle-disabled", !flagellumEnabled);
    const mode = !flagellumEnabled ? "off" : flagellumCount >= 2 ? "pair" : "single";
    _syncStateButtons("[data-flagellum-mode]", mode, "flagellumMode");
    const behaviorBtn = document.querySelector('[data-flagellum-subscope="behavior"]');
    if (behaviorBtn) behaviorBtn.disabled = !flagellumEnabled;
    if (!flagellumEnabled) closeActiveFinePanel();
}

function _syncStateButtons(selector, activeValue, dataKey) {
    document.querySelectorAll(selector).forEach(button => {
        const value = String(button.dataset[dataKey] || "").toLowerCase();
        const active = value === activeValue;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function _syncMelaninUi() {
    const cb = document.getElementById("melaninEnabled");
    if (cb) cb.checked = melaninEnabled;
}

function _syncGfpUi() {
    const cb = document.getElementById("gfpEnabled");
    if (cb) cb.checked = gfpEnabled;
}

export function hasActiveOrganellePanel() {
    return Boolean(_activeOrganellePanel);
}

export function openOrganellePanel(id) {
    if (!id || id === "general") {
        closeActiveFinePanel({resetSubscope: true});
        closeActiveOrganellePanel();
        return;
    }
    if (id !== "flagellum") hideActiveFinePanel();
    if (_activeOrganellePanel && _activeOrganellePanel !== id) _closeOrganellePanel(_activeOrganellePanel);
    _openOrganellePanel(id);
}

function _toggleOrganellePanel(id) {
    if (!id) return;
    setCreateInfoScope(id);
    window.dispatchEvent(new CustomEvent("biolab:create-info-scope-change", {
        detail: {scope: id, source: "button", fadeHighlight: true}
    }));
}

function _openOrganellePanel(id) {
    if (!_isCreatePanelVisible()) return;
    const panel = document.getElementById(`organellePanel${_cap(id)}`);
    const btn   = document.getElementById(`organelleBtn${_cap(id)}`);
    if (!panel) return;

    if (_activeOrganellePanel === id && panel.classList.contains("panel-open") && !panel.classList.contains("hidden")) return;

    _clearPanelHideTimer(id);
    panel.classList.remove("hidden");
    requestAnimationFrame(() => {
        if (_activeOrganellePanel === id || !panel.classList.contains("hidden")) {
            panel.classList.add("panel-open");
        }
    });
    btn?.classList.add("active");
    _activeOrganellePanel = id;
    if (id !== "flagellum") hideActiveFinePanel();
}

function _closeOrganellePanel(id) {
    const panel = document.getElementById(`organellePanel${_cap(id)}`);
    const btn   = document.getElementById(`organelleBtn${_cap(id)}`);
    if (!panel) return;

    _clearPanelHideTimer(id);
    panel.classList.remove("panel-open");
    window.dispatchEvent(new CustomEvent("biolab:organelle-panel-visibility-change", {detail: {open: false, panel: id}}));

    const timer = window.setTimeout(() => {
        // Do not hide a panel that was reopened while the close animation was pending.
        if (_activeOrganellePanel !== id) panel.classList.add("hidden");
        _panelHideTimers.delete(id);
    }, _animFastMs());
    _panelHideTimers.set(id, timer);

    btn?.classList.remove("active");
    if (_activeOrganellePanel === id) _activeOrganellePanel = null;
}

export function closeActiveOrganellePanel() {
    if (_activeOrganellePanel) {
        _closeOrganellePanel(_activeOrganellePanel);
        return true;
    }
    return false;
}

export function hasActiveFinePanel() {
    return false;
}

export function openFinePanel() {
    closeActiveFinePanel();
}

export function closeActiveFinePanel(options = {}) {
    const resetSubscope = options.resetSubscope !== false;
    if (resetSubscope) _flagellumSubscope = "general";
    _syncFlagellumSubscopeUi(_flagellumSubscope);
    return false;
}

export function hideActiveFinePanel() {
    _syncFlagellumSubscopeUi(_flagellumSubscope);
    return false;
}

function _bindFlagellumSubscopeButtons() {
    const buttons = Array.from(document.querySelectorAll("[data-flagellum-subscope]"));
    if (!buttons.length) return;

    _syncFlagellumSubscopeUi(_flagellumSubscope);
    buttons.forEach(button => button.addEventListener("click", e => {
        e.stopPropagation();
        const scope = String(button.dataset.flagellumSubscope || "general").toLowerCase();
        if (scope === "behavior" && !flagellumEnabled) return;

        _flagellumSubscope = scope === "behavior" ? "behavior" : "general";
        _syncFlagellumSubscopeUi(_flagellumSubscope);

        if (_activeOrganellePanel && _activeOrganellePanel !== "flagellum") {
            _closeOrganellePanel(_activeOrganellePanel);
        }
        _openOrganellePanel("flagellum");
    }));
}

function _syncFlagellumSubscopeUi(scope = null) {
    const active = scope ?? _flagellumSubscope;
    document.querySelectorAll("[data-flagellum-subscope]").forEach(button => {
        const value = String(button.dataset.flagellumSubscope || "general").toLowerCase();
        button.classList.toggle("active", value === active);
        button.setAttribute("aria-pressed", String(value === active));
        if (value === "behavior") button.disabled = !flagellumEnabled;
        document.getElementById("flagellumMotionControls")?.classList.toggle("hidden", active !== "behavior");
    });
}

function _clearPanelHideTimer(id) {
    const timer = _panelHideTimers.get(id);
    if (timer) {
        window.clearTimeout(timer);
        _panelHideTimers.delete(id);
    }
}

function _isCreatePanelVisible() {
    const panel = document.getElementById("tabCreate");
    return Boolean(panel && !panel.classList.contains("hidden"));
}

function _animFastMs() {
    const raw = cssVar("--anim-fast");
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) return 180;
    return raw.includes("ms") ? value : value * 1000;
}

function _normalizeFlagellumCount(value) {
    const rounded = Math.round(Number(value) || 1);
    return Math.max(1, Math.min(2, rounded));
}

function _cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}





