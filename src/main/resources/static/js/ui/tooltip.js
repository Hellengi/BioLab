/**
 * ui/tooltip.js
 * Единый кастомный tooltip для toolbar и cell information.
 * Tooltip позиционируется через fixed-координаты и не выходит за края экрана.
 */

const VIEWPORT_PADDING = 8;
const DEFAULT_GAP = 8;

export function attachTooltip(host, tooltip, options = {}) {
    if (!host || !tooltip || host._appTooltipCleanup) return;

    const originalParent = tooltip.parentNode;
    const originalNextSibling = tooltip.nextSibling;

    if (tooltip.parentElement !== document.body) {
        document.body.appendChild(tooltip);
    }

    const config = {
        gap: options.gap ?? DEFAULT_GAP,
        maxWidth: options.maxWidth ?? 320,
    };

    const show = () => showTooltip(host, tooltip, config);
    const hide = () => hideTooltip(tooltip);
    const reposition = () => {
        if (tooltip.classList.contains("app-tooltip--visible")) {
            positionTooltip(host, tooltip, config);
        }
    };

    host.addEventListener("mouseenter", show);
    host.addEventListener("focusin", show);
    host.addEventListener("mouseleave", hide);
    host.addEventListener("focusout", hide);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    host._appTooltipCleanup = () => {
        host.removeEventListener("mouseenter", show);
        host.removeEventListener("focusin", show);
        host.removeEventListener("mouseleave", hide);
        host.removeEventListener("focusout", hide);
        window.removeEventListener("resize", reposition);
        window.removeEventListener("scroll", reposition, true);
        hideTooltip(tooltip);

        if (originalParent && tooltip.parentNode === document.body) {
            if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
                originalParent.insertBefore(tooltip, originalNextSibling);
            } else {
                originalParent.appendChild(tooltip);
            }
        }

        host._appTooltipCleanup = null;
    };
}

export function detachTooltip(host) {
    if (host?._appTooltipCleanup) {
        host._appTooltipCleanup();
    }
}

function showTooltip(host, tooltip, config) {
    tooltip.style.maxWidth = `${config.maxWidth}px`;
    tooltip.classList.add("app-tooltip--visible");
    tooltip.setAttribute("aria-hidden", "false");
    positionTooltip(host, tooltip, config);
}

function hideTooltip(tooltip) {
    tooltip.classList.remove("app-tooltip--visible", "app-tooltip--above");
    tooltip.setAttribute("aria-hidden", "true");
}

function positionTooltip(host, tooltip, config) {
    const hostRect = host.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    const tooltipWidth = Math.min(tooltipRect.width || config.maxWidth, config.maxWidth);
    const tooltipHeight = tooltipRect.height || tooltip.scrollHeight || 0;

    const preferredLeft = hostRect.left + hostRect.width / 2 - tooltipWidth / 2;
    const maxLeft = window.innerWidth - tooltipWidth - VIEWPORT_PADDING;
    const left = clamp(preferredLeft, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, maxLeft));

    const bottomTop = hostRect.bottom + config.gap;
    const topTop = hostRect.top - tooltipHeight - config.gap;
    const fitsBottom = bottomTop + tooltipHeight <= window.innerHeight - VIEWPORT_PADDING;
    const top = fitsBottom ? bottomTop : Math.max(VIEWPORT_PADDING, topTop);

    tooltip.classList.toggle("app-tooltip--above", !fitsBottom);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    const hostCenter = hostRect.left + hostRect.width / 2;
    const arrowLeft = clamp(hostCenter - left, 12, tooltipWidth - 12);
    tooltip.style.setProperty("--tooltip-arrow-left", `${arrowLeft}px`);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
