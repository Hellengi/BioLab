/**
 * Shared renderer for informational values with formula tooltips.
 * Used by Selected Cell and Create Cell panels.
 */
function clearElement(element) {
    element.replaceChildren();
}

function fillTooltip(tooltip, text) {
    for (const [index, line] of String(text ?? "").split("\n").entries()) {
        if (index > 0) {
            const divider = document.createElement("hr");
            divider.className = "cell-info-tooltip-divider";
            tooltip.appendChild(divider);
        }

        const row = document.createElement("span");
        row.innerHTML = line;
        tooltip.appendChild(row);
    }
}

function positionTooltip(host, tooltip) {
    const rect = host.getBoundingClientRect();
    const width = Math.min(tooltip.scrollWidth, 320);
    const left = Math.min(rect.left, window.innerWidth - width - 8);

    tooltip.style.left = `${Math.max(8, left)}px`;
    tooltip.style.top = `${rect.bottom + 6}px`;
}

function appendTooltipValue(parent, value, text) {
    const host = document.createElement("span");
    host.className = "cell-info-value cell-info-tooltip-host";

    const number = document.createElement("span");
    number.className = "cell-info-tooltip-number";
    number.textContent = value;

    const tooltip = document.createElement("span");
    tooltip.className = "cell-info-tooltip";
    fillTooltip(tooltip, text);

    host.addEventListener("mouseenter", () => {
        tooltip.style.display = "block";
        positionTooltip(host, tooltip);
    });
    host.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
    });

    host.append(number, tooltip);
    parent.appendChild(host);
    return host;
}

function updateTooltipValue(host, value, text) {
    if (!host) return;

    const number = host.querySelector(".cell-info-tooltip-number");
    if (number) number.textContent = value;

    const tooltip = host.querySelector(".cell-info-tooltip");
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

export function setTooltipPair(element, leftValue, leftTooltip, rightValue, rightTooltip) {
    if (!element) return;

    if (!element._tooltipPair) {
        clearElement(element);
        element._tooltipPair = {
            left: appendTooltipValue(element, leftValue, leftTooltip),
            right: null,
        };
        appendSeparator(element);
        element._tooltipPair.right = appendTooltipValue(element, rightValue, rightTooltip);
        return;
    }

    updateTooltipValue(element._tooltipPair.left, leftValue, leftTooltip);
    updateTooltipValue(element._tooltipPair.right, rightValue, rightTooltip);
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
