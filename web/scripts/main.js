import { initPlayer, lockDownVideoUI, forceSubtitlesOn, unlockAutoplay, setStopAt } from "./player.js";
import { searchNext } from "./api.js";
import { showToast } from "./ui.js";

/**
 * Returns a DOM element by id and throws if it doesn't exist.
 * This avoids silent null errors later.
 */
function mustGet(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element #${id}`);
    return el;
}

const video = /** @type {HTMLVideoElement} */ (mustGet("video"));
const form = /** @type {HTMLFormElement} */ (mustGet("form"));
const input = /** @type {HTMLInputElement} */ (mustGet("query"));
const offsetInput = /** @type {HTMLInputElement} */ (mustGet("offset"));

/**
 * App configuration.
 * - HLS_URL is the HLS manifest (m3u8).
 * - API_BASE is your backend endpoint.
 *
 * Keep these as HTTP in local dev unless you fully run HTTPS everywhere.
 */
const CONFIG = {
    HLS_URL: "http://localhost:5173/public/hls/index.m3u8",
    API_BASE: "http://localhost:8787/api/search"
};

/**
 * State for "repeat search => next match".
 * If the same query is submitted again, we pass after_ms as the last end time.
 */
const state = {
    lastQuery: "",
    lastEndMs: 0
};

/**
 * Bootstraps video playback: HLS attachment and UI restrictions.
 */
function bootstrap() {
    initPlayer(video, CONFIG.HLS_URL);
    lockDownVideoUI(video);
    bindAutoplayUnlock(video);
    bindSearch(form);
    bindSubtitlesSafety(video);
}

bootstrap();

/**
 * Enables audio + playback on the first real user interaction to satisfy autoplay policies.
 */
function bindAutoplayUnlock(videoEl) {
    document.addEventListener(
        "pointerdown",
        () => {
            unlockAutoplay(videoEl);
            forceSubtitlesOn(videoEl);
        },
        { once: true }
    );
}

/**
 * Ensures subtitles are shown when metadata is loaded (some browsers ignore track default).
 */
function bindSubtitlesSafety(videoEl) {
    videoEl.addEventListener("loadedmetadata", () => {
        forceSubtitlesOn(videoEl);
    });
}

/**
 * Binds the search form submission to:
 * - fetch the next matching time span from the backend
 * - seek the video and stop at the end time
 */
function bindSearch(formEl) {
    formEl.addEventListener("submit", async (e) => {
        e.preventDefault();

        const term = input.value.trim();
        if (!term) return;

        try {
            const { start_ms, end_ms } = await fetchNextSpan(term);

            // Stop the playback at end_ms (in seconds)
            setStopAt(video, end_ms / 1000);

            // Seek to start_ms (in seconds) and play best-effort
            video.currentTime = start_ms / 1000;
            await video.play().catch(() => { });
            forceSubtitlesOn(video);
        } catch {
            showToast("No encontrado");
        }
    });
}

/**
 * Requests the next matching span for a term, handling:
 * - query changes (reset after_ms)
 * - repeated queries (advance after_ms)
 * - runtime offset adjustment (offset_ms)
 */
async function fetchNextSpan(term) {
    if (term !== state.lastQuery) {
        state.lastQuery = term;
        state.lastEndMs = 0;
    }

    const offsetMs = Number(offsetInput.value || 0);
    const afterMs = state.lastEndMs + 1;

    const result = await searchNext(CONFIG.API_BASE, term, afterMs, offsetMs);
    state.lastEndMs = result.end_ms;

    return result;
}
