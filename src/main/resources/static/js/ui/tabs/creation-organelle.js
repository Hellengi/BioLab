import { cssVar } from "../../core/utils.js";
import { setCreateInfoScope } from "../../store/state.js";

let _activeOrganellePanel = null;
let _organellePanelsInitialized = false;
const _panelHideTimers = new Map();

export let chloroplastEnabled = false;
export let lysosomeEnabled = false;
export let melaninEnabled = false;

export function setChloroplastEnabled(value) {
    chloroplastEnabled = Boolean(value);
    _syncChloroplastUi();
}

export function setLysosomeEnabled(value) {
    lysosomeEnabled = Boolean(value);
    _syncLysosomeUi();
}

export function setMelaninEnabled(value) {
    melaninEnabled = Boolean(value);
    _syncMelaninUi();
}

export function initOrganellePanels(onToggle) {
    if (_organellePanelsInitialized) return;

    const hostReady = _setupHost();
    if (!hostReady) return;

    _bindOrganelleButtons();
    _bindChloroplastToggle(onToggle);
    _bindLysosomeToggle(onToggle);
    _bindMelaninToggle(onToggle);

    _organellePanelsInitialized = true;
}

function _setupHost() {
    const host = document.getElementById("organellePanelHost");
    if (!host) {
        console.warn("organellePanelHost not found");
        return false;
    }

    for (const id of ["nucleus", "cytosol", "membrane", "chloroplast", "lysosome"]) {
        const panel = document.getElementById(`organellePanel${_cap(id)}`);
        if (panel && panel.parentElement !== host) host.appendChild(panel);
    }

    return true;
}

function _bindOrganelleButtons() {
    document.querySelectorAll(".organelle-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            if (e.target.closest(".organelle-toggle")) return;

            const id = btn.dataset.organelle;
            if (id) _toggleOrganellePanel(id);
        });
    });
}

function _bindChloroplastToggle(onToggle) {
    const toggle = document.getElementById("chloroplastToggle");
    const checkbox = document.getElementById("chloroplastEnabled");
    if (!toggle && !checkbox) return;

    _syncChloroplastUi();
    toggle?.addEventListener("click", e => {
        e.stopPropagation();
        setChloroplastEnabled(!chloroplastEnabled);

        if (_activeOrganellePanel && _activeOrganellePanel !== "chloroplast") {
            _closeOrganellePanel(_activeOrganellePanel);
        }
        _openOrganellePanel("chloroplast");

        onToggle?.();
    });
    checkbox?.addEventListener("change", () => {
        setChloroplastEnabled(checkbox.checked);
        if (_activeOrganellePanel !== "chloroplast") {
            _openOrganellePanel("chloroplast");
        }
        onToggle?.();
    });
}

function _bindLysosomeToggle(onToggle) {
    const toggle = document.getElementById("lysosomeToggle");
    const checkbox = document.getElementById("lysosomeEnabled");
    if (!toggle && !checkbox) return;

    _syncLysosomeUi();
    toggle?.addEventListener("click", e => {
        e.stopPropagation();
        setLysosomeEnabled(!lysosomeEnabled);

        if (_activeOrganellePanel && _activeOrganellePanel !== "lysosome") {
            _closeOrganellePanel(_activeOrganellePanel);
        }
        _openOrganellePanel("lysosome");

        onToggle?.();
    });
    checkbox?.addEventListener("change", () => {
        setLysosomeEnabled(checkbox.checked);
        if (_activeOrganellePanel !== "lysosome") {
            _openOrganellePanel("lysosome");
        }
        onToggle?.();
    });
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

function _syncChloroplastUi() {
    const cb = document.getElementById("chloroplastEnabled");
    const btn = document.getElementById("organelleBtnChloroplast");
    if (cb) cb.checked = chloroplastEnabled;
    btn?.classList.toggle("organelle-disabled", !chloroplastEnabled);
}

function _syncLysosomeUi() {
    const cb = document.getElementById("lysosomeEnabled");
    const btn = document.getElementById("organelleBtnLysosome");
    if (cb) cb.checked = lysosomeEnabled;
    btn?.classList.toggle("organelle-disabled", !lysosomeEnabled);
}

function _syncMelaninUi() {
    const cb = document.getElementById("melaninEnabled");
    if (cb) cb.checked = melaninEnabled;
}

export function hasActiveOrganellePanel() {
    return Boolean(_activeOrganellePanel);
}

export function openOrganellePanel(id) {
    if (!id || id === "general") {
        closeActiveOrganellePanel();
        return;
    }
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

    _clearPanelHideTimer(id);
    panel.classList.remove("hidden");
    // Force style recalculation so .panel-open transition always starts
    // from the visible-but-closed state, without being cancelled by an old timeout.
    void panel.offsetWidth;
    panel.classList.add("panel-open");
    btn?.classList.add("active");
    _activeOrganellePanel = id;
}

function _closeOrganellePanel(id) {
    const panel = document.getElementById(`organellePanel${_cap(id)}`);
    const btn   = document.getElementById(`organelleBtn${_cap(id)}`);
    if (!panel) return;

    _clearPanelHideTimer(id);
    panel.classList.remove("panel-open");

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

function _cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
