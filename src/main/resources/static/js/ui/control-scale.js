const SCALE_LOGARITHMIC = "logarithmic";
const SIGNED_LOG_K = 3.0;

export function controlScale(control) {
    return String(control?.scale ?? "linear").trim().toLowerCase();
}

export function isLogarithmicScale(control) {
    return controlScale(control) === SCALE_LOGARITHMIC;
}

export function sliderBoundsForControl(control) {
    if (!isLogarithmicScale(control)) {
        return {
            min: Number(control?.min ?? 0),
            max: Number(control?.max ?? 100),
            step: Number(control?.step ?? 1),
        };
    }

    const min = Number(control?.min ?? 0);
    const max = Number(control?.max ?? 100);
    if (min < 0 && max > 0) {
        return { min: -100, max: 100, step: 1 };
    }
    if (min > 0 && max > min) {
        return { min: 0, max: 100, step: 1 };
    }
    return {
        min: Number(control?.min ?? 0),
        max: Number(control?.max ?? 100),
        step: Number(control?.step ?? 1),
    };
}

export function valueFromSlider(rawValue, control) {
    if (!isLogarithmicScale(control)) {
        return roundControlValue(Number(rawValue), control);
    }

    const min = Number(control?.min ?? 0);
    const max = Number(control?.max ?? 100);
    if (min < 0 && max > 0) {
        const maxAbs = Math.max(Math.abs(min), Math.abs(max), 1.0e-9);
        const raw = Math.max(-100, Math.min(100, Number(rawValue) || 0));
        const sign = raw < 0 ? -1 : 1;
        const x = Math.abs(raw) / 100;
        const value = sign * maxAbs * (Math.exp(SIGNED_LOG_K * x) - 1) / (Math.exp(SIGNED_LOG_K) - 1);
        return roundControlValue(value, control);
    }

    if (min > 0 && max > min) {
        const t = Math.max(0, Math.min(100, Number(rawValue) || 0)) / 100;
        const value = Math.exp(Math.log(min) + t * (Math.log(max) - Math.log(min)));
        return roundControlValue(value, control);
    }

    return roundControlValue(Number(rawValue), control);
}

export function sliderFromValue(value, control) {
    if (!isLogarithmicScale(control)) {
        return roundControlValue(Number(value), control);
    }

    const min = Number(control?.min ?? 0);
    const max = Number(control?.max ?? 100);
    const v = clampControlValue(Number(value), control);
    if (min < 0 && max > 0) {
        const maxAbs = Math.max(Math.abs(min), Math.abs(max), 1.0e-9);
        const sign = v < 0 ? -1 : 1;
        const y = Math.min(1, Math.abs(v) / maxAbs);
        return Math.round(sign * 100 * Math.log(1 + y * (Math.exp(SIGNED_LOG_K) - 1)) / SIGNED_LOG_K);
    }

    if (min > 0 && max > min) {
        return Math.round(100 * (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min)));
    }

    return roundControlValue(v, control);
}

export function clampControlValue(value, control) {
    const min = Number(control?.min ?? 0);
    const max = Number(control?.max ?? 100);
    return Math.max(Math.min(min, max), Math.min(Math.max(min, max), Number(value)));
}

export function roundControlValue(value, control) {
    const step = Math.max(0, Number(control?.step ?? 0));
    const min = Number(control?.min ?? 0);
    let rounded = clampControlValue(value, control);
    if (step > 0) {
        rounded = min + Math.round((rounded - min) / step) * step;
    }
    const decimals = Math.max(0, String(step).split(".")[1]?.length ?? 0);
    return Number(clampControlValue(rounded, control).toFixed(Math.min(9, decimals)));
}
