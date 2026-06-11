import { state } from "../store/state.js";
import {updateStats} from "../store/actions.js";
import { recordClientFps } from "../metrics/client-metrics.js";

let changedFrameCount = 0;
let windowStartMs = performance.now();
let lastRenderedTick = null;

export function recordWorldFrame(world) {
    if (!world) return;

    if (world.tick !== lastRenderedTick) {
        changedFrameCount++;
        lastRenderedTick = world.tick;
    }

    const now = performance.now();
    const elapsed = now - windowStartMs;

    if (elapsed < 1000) return;

    state.fps = Math.round(changedFrameCount * 1000 / elapsed);
    recordClientFps(state.fps);
    changedFrameCount = 0;
    windowStartMs = now;

    updateStats();
}




