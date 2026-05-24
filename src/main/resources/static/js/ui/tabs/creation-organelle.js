/**
 * ui/tabs/creation-organelle.js
 *
 * Логика боковых панелей органелл:
 *  – инициализация
 *  – открытие / закрытие
 *  – toggle хлоропласта
 *
 * Панели физически живут в <aside id="organellePanelHost">
 * (прямо внутри .main-layout, между environment и sidebar-wrapper).
 * JS переносит .organelle-panel элементы туда при инициализации.
 */

import { onCreateFormChange } from "./creation.js";
import {cssVar} from "../../core/utils.js";

// ─── Состояние ────────────────────────────────────────────────────────────────

let _activeOrganellePanel = null;
let _organellePanelsInitialized = false;

export let chloroplastEnabled = false;

// ─── Инициализация ────────────────────────────────────────────────────────────

/**
 * Вызывается один раз из initCreatePanel().
 * Переносит панели органелл в #organellePanelHost и вешает обработчики.
 */
export function initOrganellePanels(onChloroplastToggle) {
    if (_organellePanelsInitialized) return;

    _setupHost();
    _bindOrganelleButtons();
    _bindChloroplastToggle(onChloroplastToggle);

    _organellePanelsInitialized = true;
}

function _setupHost() {
    // Хост уже в DOM (aside#organellePanelHost в index.html)
    const host = document.getElementById("organellePanelHost");
    if (!host) {
        console.warn("organellePanelHost not found");
        return;
    }

    // Переносим панели из body в host
    for (const id of ["nucleus", "cytosol", "membrane", "chloroplast"]) {
        const panel = document.getElementById(`organellePanel${_cap(id)}`);
        if (panel) host.appendChild(panel);
    }
}

function _bindOrganelleButtons() {
    document.querySelectorAll(".organelle-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            // Клик на toggle-переключатель внутри кнопки — не открываем панель
            if (e.target.closest(".organelle-toggle")) return;
            if (btn.classList.contains("organelle-disabled")) return;

            const id = btn.dataset.organelle;
            if (id) _toggleOrganellePanel(id);
        });
    });
}

function _bindChloroplastToggle(onChloroplastToggle) {
    const toggle = document.getElementById("chloroplastToggle");
    const cb     = document.getElementById("chloroplastEnabled");
    const btn    = document.getElementById("organelleBtnChloroplast");

    if (!toggle || !cb) return;

    function syncChloroplastUi() {
        cb.checked = chloroplastEnabled;
        btn?.classList.toggle("organelle-disabled", !chloroplastEnabled);
    }

    syncChloroplastUi();

    toggle.addEventListener("click", e => {
        e.stopPropagation();

        chloroplastEnabled = !chloroplastEnabled;
        syncChloroplastUi();

        if (!chloroplastEnabled) {
            if (_activeOrganellePanel === "chloroplast") {
                _closeOrganellePanel("chloroplast");
            }
        } else {
            if (_activeOrganellePanel && _activeOrganellePanel !== "chloroplast") {
                _closeOrganellePanel(_activeOrganellePanel);
            }
            _openOrganellePanel("chloroplast");
        }

        if (onChloroplastToggle) {
            onChloroplastToggle();
        } else {
            onCreateFormChange();
        }
    });
}

// ─── Открытие / закрытие ──────────────────────────────────────────────────────

function _toggleOrganellePanel(id) {
    if (_activeOrganellePanel === id) {
        _closeOrganellePanel(id);
    } else {
        if (_activeOrganellePanel) _closeOrganellePanel(_activeOrganellePanel);
        _openOrganellePanel(id);
    }
}

function _openOrganellePanel(id) {
    const panel = document.getElementById(`organellePanel${_cap(id)}`);
    const btn   = document.getElementById(`organelleBtn${_cap(id)}`);
    if (!panel) return;

    panel.classList.remove("hidden");

    // Два rAF: браузер успевает нарисовать элемент до добавления анимации
    requestAnimationFrame(() => {
        requestAnimationFrame(() => panel.classList.add("panel-open"));
    });

    btn?.classList.add("active");
    _activeOrganellePanel = id;
}

function _closeOrganellePanel(id) {
    const panel = document.getElementById(`organellePanel${_cap(id)}`);
    const btn   = document.getElementById(`organelleBtn${_cap(id)}`);
    if (!panel) return;

    panel.classList.remove("panel-open");

    setTimeout(() => {
        panel.classList.add("hidden");
    }, parseFloat(cssVar("--anim-fast")) * 1000);

    btn?.classList.remove("active");
    if (_activeOrganellePanel === id) _activeOrganellePanel = null;
}

export function closeActiveOrganellePanel() {
    if (_activeOrganellePanel) {
        _closeOrganellePanel(_activeOrganellePanel);
    }
}

// ─── Хелперы ──────────────────────────────────────────────────────────────────

function _cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
