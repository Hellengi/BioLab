
/**
 * Shared renderer for informational values with formula tooltips.
 * Used by Cell Selection and Cell Creation panels.
 */

import { attachTooltip, detachTooltip } from "./tooltip.js";

function clearElement(element) {
    element.querySelectorAll?.(".cell-info-tooltip-host").forEach(detachTooltip);
    element.replaceChildren();
}

function fillTooltip(tooltip, text) {
    for (const [index, line] of String(text ?? "").split("\n").entries()) {
        if (index > 0) {
            const divider = document.createElement("hr");
            divider.className = "app-tooltip-divider";
            tooltip.appendChild(divider);
        }

        const row = document.createElement("span");
        row.innerHTML = line;
        tooltip.appendChild(row);
    }
}

function appendTooltipValue(parent, value, text) {
    const host = document.createElement("span");
    host.className = "cell-info-value cell-info-tooltip-host";
    host.tabIndex = 0;

    const number = document.createElement("span");
    number.className = "cell-info-tooltip-number";
    number.textContent = value;

    const tooltip = document.createElement("span");
    tooltip.className = "app-tooltip cell-info-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("aria-hidden", "true");
    fillTooltip(tooltip, text);
    host._cellInfoTooltip = tooltip;

    host.append(number, tooltip);
    parent.appendChild(host);
    attachTooltip(host, tooltip, { maxWidth: 320 });
    return host;
}

function updateTooltipValue(host, value, text) {
    if (!host) return;

    const number = host.querySelector(".cell-info-tooltip-number");
    if (number) number.textContent = value;

    const tooltip = host._cellInfoTooltip ?? host.querySelector(".cell-info-tooltip");
    if (tooltip) {
        tooltip.replaceChildren();
        fillTooltip(tooltip, text);
    }
}

function appendSeparator(parent) {
    const separator = document.createElement("span");
    separator.className = "cell-info-separator";
    separator.textContent = "/";
    parent.appendChild(separator);
}

export function clearTooltipElement(element) {
    if (!element) return;
    element._tooltipPair = null;
    element._tooltipValue = null;
    clearElement(element);
}


export function setTooltipValue(element, value, tooltipText) {
    if (!element) return;

    if (!element._tooltipValue) {
        clearElement(element);
        element._tooltipValue = appendTooltipValue(element, value, tooltipText);
        return;
    }

    updateTooltipValue(element._tooltipValue, value, tooltipText);
}

export function setTooltipPairValue(element, leftValue, leftTooltipText, rightValue, rightTooltipText) {
    if (!element) return;

    if (!element._tooltipPair) {
        clearElement(element);
        const left = appendTooltipValue(element, leftValue, leftTooltipText);
        appendSeparator(element);
        const right = appendTooltipValue(element, rightValue, rightTooltipText);
        element._tooltipPair = {left, right};
        element._tooltipValue = null;
        return;
    }

    updateTooltipValue(element._tooltipPair.left, leftValue, leftTooltipText);
    updateTooltipValue(element._tooltipPair.right, rightValue, rightTooltipText);
}
