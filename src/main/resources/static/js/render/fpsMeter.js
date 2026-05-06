import { state } from "../store/state.js";
import { updateStats } from "../store/store.js";

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
    changedFrameCount = 0;
    windowStartMs = now;

    updateStats();
}