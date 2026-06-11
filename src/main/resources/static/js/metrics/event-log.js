import { dom } from "../ui/dom.js";
import { appendEventLogEntry, clearEventLog, getEventLog } from "../transport/api/simulation.js";

let benchmarkResultHandler = null;
let eventLogVisibilityObserver = null;
let pendingEventLogScrollTimer = 0;
let pendingEventLogScrollAnimation = 0;
let activeEventLogSmoothScroll = 0;

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
            scheduleEventLogScrollToBottom({ force: true, settle: true });
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
    for (const entry of Array.from(dom.eventLogList.querySelectorAll(".log-entry--dynamic"))) {
        entry.remove();
    }
    for (const entry of entries) {
        appendRenderedEntry(entry, { scroll: false });
    }
}

function appendRenderedEntry(rawEntry, options = {}) {
    if (!dom.eventLogList) return;

    const shouldScrollAfterAppend = options.scroll === true
        || (options.scroll !== false && shouldAutoScrollForNewEntry());

    const entry = normalizeEntry(rawEntry);
    const article = document.createElement("article");
    article.className = `log-entry log-entry--dynamic log-entry--${entry.tone} log-entry--type-${cssToken(entry.type)}`;
    article.dataset.eventLogId = entry.id ?? "";

    const iconEl = document.createElement("div");
    iconEl.className = "log-entry-icon";
    iconEl.textContent = entry.icon;

    const content = document.createElement("div");
    content.className = "log-entry-content";

    const header = document.createElement("div");
    header.className = "log-entry-header";

    const titleEl = document.createElement("div");
    titleEl.className = "log-entry-title";
    titleEl.textContent = entry.title;

    const timeEl = document.createElement("time");
    timeEl.className = "log-entry-time";
    timeEl.dateTime = entry.createdAt;
    timeEl.textContent = formatTime(entry.createdAt);

    header.append(titleEl, timeEl);

    const bodyEl = document.createElement("div");
    bodyEl.className = "log-entry-body";
    bodyEl.textContent = entry.body;

    content.append(header, bodyEl);

    const benchmarkReport = entry.payload?.benchmarkReport;
    if (benchmarkReport) {
        const actions = document.createElement("div");
        actions.className = "log-entry-actions";
        const showBtn = document.createElement("button");
        showBtn.type = "button";
        showBtn.className = "btn btn-outline-secondary log-entry-action-btn";
        showBtn.textContent = "show results";
        showBtn.addEventListener("click", () => benchmarkResultHandler?.(benchmarkReport));
        actions.appendChild(showBtn);
        content.appendChild(actions);
    }

    article.append(iconEl, content);
    dom.eventLogList.appendChild(article);

    if (shouldScrollAfterAppend) {
        scheduleEventLogScrollToBottom({ force: true, smooth: isLogPanelVisible() });
    }
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
        if (isLogPanelVisible()) {
            scheduleEventLogScrollToBottom({ force: true, settle: true });
        }
    });
    eventLogVisibilityObserver.observe(panel, { attributes: true, attributeFilter: ["class"] });
}

function shouldAutoScrollForNewEntry() {
    return isLogPanelVisible() && isEventLogAtBottom();
}

function isLogPanelVisible() {
    const panel = document.getElementById("tabLogs");
    return Boolean(panel && !panel.classList.contains("hidden"));
}

function eventLogScrollContainer() {
    const sidebar = dom.eventLogList?.closest(".cell-sidebar");
    if (sidebar) return sidebar;
    return dom.eventLogList ?? null;
}

function eventLogBottomTop(container) {
    return Math.max(0, container.scrollHeight - container.clientHeight);
}

function isEventLogAtBottom() {
    const container = eventLogScrollContainer();
    if (!container) return false;
    const distance = eventLogBottomTop(container) - container.scrollTop;
    return distance <= 16;
}

function scheduleEventLogScrollToBottom({ force = false, smooth = false, settle = false } = {}) {
    if (!force && !shouldAutoScrollForNewEntry()) return;

    cancelAnimationFrame(pendingEventLogScrollAnimation);
    cancelAnimationFrame(activeEventLogSmoothScroll);
    clearTimeout(pendingEventLogScrollTimer);

    pendingEventLogScrollAnimation = requestAnimationFrame(() => {
        pendingEventLogScrollAnimation = requestAnimationFrame(() => {
            if (smooth) {
                smoothScrollEventLogToBottom();
            } else {
                scrollEventLogToBottom({ behavior: "auto" });
            }
        });
    });

    if (settle && !smooth) {
        pendingEventLogScrollTimer = setTimeout(() => {
            scrollEventLogToBottom({ behavior: "auto" });
            requestAnimationFrame(() => scrollEventLogToBottom({ behavior: "auto" }));
        }, 120);
    }
}

function scrollEventLogToBottom({ behavior = "auto" } = {}) {
    const container = eventLogScrollContainer();
    if (!container) return;
    const top = eventLogBottomTop(container);
    if (typeof container.scrollTo === "function") {
        container.scrollTo({ top, behavior });
    } else {
        container.scrollTop = top;
    }
}

function smoothScrollEventLogToBottom() {
    const container = eventLogScrollContainer();
    if (!container) return;

    const startTop = container.scrollTop;
    const targetTop = eventLogBottomTop(container);
    const distance = targetTop - startTop;
    if (Math.abs(distance) <= 1) {
        container.scrollTop = targetTop;
        return;
    }

    const durationMs = Math.min(420, Math.max(180, Math.abs(distance) * 2.2));
    const startedAt = performance.now();

    function step(now) {
        const nextTargetTop = eventLogBottomTop(container);
        const t = Math.min(1, (now - startedAt) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        container.scrollTop = startTop + (nextTargetTop - startTop) * eased;

        if (t < 1) {
            activeEventLogSmoothScroll = requestAnimationFrame(step);
        } else {
            container.scrollTop = eventLogBottomTop(container);
        }
    }

    activeEventLogSmoothScroll = requestAnimationFrame(step);
}

function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--:--:--";
    return date.toLocaleTimeString();
}
