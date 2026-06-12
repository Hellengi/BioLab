import { dom } from "../ui/dom.js";
import { appendEventLogEntry, clearEventLog, getEventLog } from "../transport/api/simulation.js";

let benchmarkResultHandler = null;
let eventLogVisibilityObserver = null;
let pendingEventLogScrollTimer = 0;
let pendingEventLogScrollAnimation = 0;
let programmaticEventLogScrollUntilMs = 0;
let eventLogPinnedToBottom = true;
let trackedEventLogScrollContainer = null;

export function registerBenchmarkResultHandler(handler) {
    benchmarkResultHandler = typeof handler === "function" ? handler : null;
}

export function bindEventLogControls() {
    dom.eventLogClearBtn?.addEventListener("click", () => {
        void clearEventHistory();
    });

    document.querySelector('[data-tab="logs"]')?.addEventListener("click", () => {
        // Fallback for older tab code. Do not force-scroll when the user is
        // already reading the Event Log; only scroll when this click opens it.
        const wasVisible = isLogPanelVisible();
        requestAnimationFrame(() => {
            if (!wasVisible && isLogPanelVisible()) {
                scheduleEventLogScrollToBottom({ force: true, settle: true });
            }
        });
    });

    window.addEventListener("biolab:tab-change", event => {
        if (event?.detail?.tabKey === "logs") {
            scheduleEventLogScrollToBottom({ force: true, settle: true });
        }
    });

    installEventLogScrollTracking();
    installEventLogVisibilityScroll();
    void refreshEventLog();
}

export async function refreshEventLog(options = {}) {
    if (!dom.eventLogList) return [];
    try {
        const shouldScrollAfterRefresh = options.scroll === true
            || (options.scroll !== false && shouldAutoScrollForNewEntry());
        const entries = await getEventLog();
        renderEventLog(Array.isArray(entries) ? entries : []);
        if (shouldScrollAfterRefresh) {
            scheduleEventLogScrollToBottom({
                force: true,
                smooth: isLogPanelVisible(),
                settle: true,
            });
        }
        return entries;
    } catch (error) {
        console.error("Failed to load event log", error);
        return [];
    }
}

export async function appendEventLog(entry) {
    const fallback = normalizeEntry(entry);
    try {
        const saved = await appendEventLogEntry(fallback);
        appendRenderedEntry(saved);
        return saved;
    } catch (error) {
        console.error("Failed to persist event log entry", error);
        appendRenderedEntry({
            ...fallback,
            id: `local-${Date.now()}`,
            createdAt: new Date().toISOString(),
            payload: fallback.payload ?? {},
        });
        return fallback;
    }
}

async function clearEventHistory() {
    try {
        await clearEventLog();
        renderEventLog([]);
    } catch (error) {
        console.error("Failed to clear event log", error);
        appendRenderedEntry({
            id: `local-error-${Date.now()}`,
            type: "event-log-error",
            title: "Event log error",
            body: "Failed to clear event history.",
            tone: "danger",
            icon: "!",
            createdAt: new Date().toISOString(),
            payload: {},
        });
    }
}

function renderEventLog(entries) {
    if (!dom.eventLogList) return;
    const container = eventLogScrollContainer();
    const previousScrollTop = container?.scrollTop ?? 0;

    for (const entry of Array.from(dom.eventLogList.querySelectorAll(".log-entry--dynamic"))) {
        entry.remove();
    }
    for (const entry of entries) {
        appendRenderedEntry(entry, { scroll: false });
    }

    if (container) {
        container.scrollTop = Math.min(previousScrollTop, eventLogBottomTop(container));
    }
    eventLogPinnedToBottom = isEventLogAtBottom();
}

function appendRenderedEntry(rawEntry, options = {}) {
    if (!dom.eventLogList) return;

    const shouldScrollAfterAppend = options.scroll === true
        || (options.scroll !== false && shouldAutoScrollForNewEntry());

    dom.eventLogList.appendChild(createLogEntryArticle(normalizeEntry(rawEntry)));

    if (shouldScrollAfterAppend) {
        eventLogPinnedToBottom = true;
        scheduleEventLogScrollToBottom({ force: true, smooth: isLogPanelVisible() });
    } else {
        eventLogPinnedToBottom = isEventLogAtBottom();
    }
}

function createLogEntryArticle(entry) {
    const article = document.createElement("article");
    article.className = `log-entry log-entry--dynamic log-entry--${entry.tone} log-entry--type-${cssToken(entry.type)}`;
    article.dataset.eventLogId = entry.id ?? "";

    const combinedEntries = normalizedCombinedEntries(entry);
    if (combinedEntries.length > 0) {
        article.classList.add("log-entry--has-combined");
    }

    appendLogEntrySection(article, entry, {
        iconClassName: "log-entry-icon log-entry-icon--primary",
        contentClassName: "log-entry-content",
        headerClassName: "log-entry-header",
        titleClassName: "log-entry-title",
        timeClassName: "log-entry-time",
        bodyClassName: "log-entry-body",
        includeBenchmarkActions: true,
    });

    for (const combinedEntry of combinedEntries) {
        article.appendChild(createLogEntryDivider());
        appendLogEntrySection(article, combinedEntry, {
            iconClassName: `log-entry-icon log-entry-icon--combined log-entry-icon--type-${cssToken(combinedEntry.type)}`,
            contentClassName: `log-entry-combined log-entry-combined--type-${cssToken(combinedEntry.type)}`,
            headerClassName: "log-entry-combined-header",
            titleClassName: "log-entry-combined-title",
            timeClassName: "log-entry-combined-time",
            bodyClassName: "log-entry-combined-body",
            includeBenchmarkActions: false,
        });
    }

    return article;
}

function appendLogEntrySection(article, entry, classes) {
    const iconEl = document.createElement("div");
    iconEl.className = classes.iconClassName;
    iconEl.textContent = entry.icon;

    const content = document.createElement("div");
    content.className = classes.contentClassName;

    content.append(
        createLogEntryHeader(entry, classes),
        createLogEntryBody(entry, classes)
    );

    if (classes.includeBenchmarkActions && entry.payload?.benchmarkReport) {
        content.appendChild(createBenchmarkActions(entry.payload.benchmarkReport));
    }

    article.append(iconEl, content);
}

function createLogEntryHeader(entry, classes) {
    const header = document.createElement("div");
    header.className = classes.headerClassName;

    const titleEl = document.createElement("div");
    titleEl.className = classes.titleClassName;
    titleEl.textContent = entry.title;

    const timeEl = document.createElement("time");
    timeEl.className = classes.timeClassName;
    timeEl.dateTime = entry.createdAt;
    timeEl.textContent = formatTime(entry.createdAt);

    header.append(titleEl, timeEl);
    return header;
}

function createLogEntryBody(entry, classes) {
    const bodyEl = document.createElement("div");
    bodyEl.className = classes.bodyClassName;
    bodyEl.textContent = entry.body;
    return bodyEl;
}

function createBenchmarkActions(benchmarkReport) {
    const actions = document.createElement("div");
    actions.className = "log-entry-actions";

    const showBtn = document.createElement("button");
    showBtn.type = "button";
    showBtn.className = "btn btn-outline-secondary log-entry-action-btn";
    showBtn.textContent = "Show results";
    showBtn.addEventListener("click", () => benchmarkResultHandler?.(benchmarkReport));

    actions.appendChild(showBtn);
    return actions;
}

function createLogEntryDivider() {
    const divider = document.createElement("div");
    divider.className = "log-entry-divider";
    return divider;
}

function normalizedCombinedEntries(entry) {
    const combinedEntries = Array.isArray(entry.payload?.combinedEntries)
        ? entry.payload.combinedEntries
        : [];
    return combinedEntries.map(normalizeEntry);
}

function normalizeEntry(entry = {}) {
    return {
        id: String(entry.id ?? ""),
        type: cleanText(entry.type, "event"),
        title: cleanText(entry.title, "Event"),
        body: cleanText(entry.body, ""),
        tone: normalizeTone(entry.tone),
        icon: cleanText(entry.icon, "I").slice(0, 2).toUpperCase(),
        createdAt: cleanText(entry.createdAt, new Date().toISOString()),
        payload: isObject(entry.payload) ? entry.payload : {},
    };
}

function cssToken(value) {
    return String(value ?? "event").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function normalizeTone(value) {
    const tone = String(value ?? "info").toLowerCase();
    return ["info", "benchmark", "danger", "muted"].includes(tone) ? tone : "info";
}

function cleanText(value, fallback) {
    const text = String(value ?? "").trim();
    return text || fallback;
}

function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function installEventLogVisibilityScroll() {
    const panel = document.getElementById("tabLogs");
    if (!panel || eventLogVisibilityObserver) return;
    eventLogVisibilityObserver = new MutationObserver(() => {
        installEventLogScrollTracking();
        if (isLogPanelVisible()) {
            eventLogPinnedToBottom = true;
            scheduleEventLogScrollToBottom({ force: true, settle: true });
        }
    });
    eventLogVisibilityObserver.observe(panel, { attributes: true, attributeFilter: ["class"] });
}

function installEventLogScrollTracking() {
    const container = eventLogScrollContainer();
    if (!container || container === trackedEventLogScrollContainer) return;
    if (trackedEventLogScrollContainer) {
        trackedEventLogScrollContainer.removeEventListener("scroll", handleEventLogScroll);
    }
    trackedEventLogScrollContainer = container;
    trackedEventLogScrollContainer.addEventListener("scroll", handleEventLogScroll, { passive: true });
}

function handleEventLogScroll() {
    if (performance.now() < programmaticEventLogScrollUntilMs) {
        eventLogPinnedToBottom = true;
        return;
    }
    eventLogPinnedToBottom = isEventLogAtBottom();
}

function shouldAutoScrollForNewEntry() {
    return isLogPanelVisible() && (eventLogPinnedToBottom || isEventLogScrollPending() || isEventLogAtBottom());
}

function isEventLogScrollPending() {
    return Boolean(pendingEventLogScrollTimer || pendingEventLogScrollAnimation)
        || performance.now() < programmaticEventLogScrollUntilMs;
}

function isLogPanelVisible() {
    const panel = document.getElementById("tabLogs");
    return Boolean(panel && !panel.classList.contains("hidden"));
}

function eventLogScrollContainer() {
    const list = dom.eventLogList;
    if (!list) return null;
    // The sidebar is the real scroll container. The log list itself is overflow: visible
    // so benchmark/reset cards can keep project-native spacing. Detecting overflow
    // dynamically made the target switch between the list and the sidebar during
    // layout updates, which caused one-frame jumps and missed smooth scrolling.
    return list.closest(".cell-sidebar") ?? list;
}

function eventLogBottomTop(container) {
    return Math.max(0, container.scrollHeight - container.clientHeight);
}

function isEventLogAtBottom() {
    const container = eventLogScrollContainer();
    if (!container) return false;
    const distance = eventLogBottomTop(container) - container.scrollTop;
    return distance <= 24;
}

function scheduleEventLogScrollToBottom({ force = false, smooth = false, settle = false } = {}) {
    if (!force && !shouldAutoScrollForNewEntry()) return;
    eventLogPinnedToBottom = true;

    cancelAnimationFrame(pendingEventLogScrollAnimation);
    clearTimeout(pendingEventLogScrollTimer);

    pendingEventLogScrollAnimation = requestAnimationFrame(() => {
        pendingEventLogScrollAnimation = 0;
        scrollEventLogToBottom({ behavior: smooth ? "smooth" : "auto" });
    });

    const settleDelayMs = smooth ? 260 : 90;
    if (settle || smooth) {
        pendingEventLogScrollTimer = setTimeout(() => {
            pendingEventLogScrollTimer = 0;
            if (eventLogPinnedToBottom || force) {
                scrollEventLogToBottom({ behavior: smooth ? "smooth" : "auto" });
            }
        }, settleDelayMs);
    }
}

function scrollEventLogToBottom({ behavior = "auto" } = {}) {
    const container = eventLogScrollContainer();
    if (!container) return;
    const top = eventLogBottomTop(container);
    programmaticEventLogScrollUntilMs = performance.now() + (behavior === "smooth" ? 600 : 180);
    if (typeof container.scrollTo === "function") {
        container.scrollTo({ top, behavior });
    } else {
        container.scrollTop = top;
    }
    eventLogPinnedToBottom = true;
}

function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--:--:--";
    return date.toLocaleTimeString();
}


