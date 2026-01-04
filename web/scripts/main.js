import {
    initPlayer,
    lockDownVideoUI,
    forceSubtitlesOn,
    unlockAutoplay,
    setStopAt
} from "./player.js";
import { searchNext } from "./api.js";

function mustGet(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element #${id}`);
    return el;
}

const video = /** @type {HTMLVideoElement} */ (mustGet("video"));
const form = /** @type {HTMLFormElement} */ (mustGet("form"));
const input = /** @type {HTMLInputElement} */ (mustGet("query"));
const status = mustGet("status");

const clipOverlay = document.getElementById("clip-overlay");
const clipOverlayBtn = document.getElementById("clip-overlay-btn");

function showClipOverlay() {
    if (!clipOverlay) return;
    clipOverlay.classList.add("open");
}

function hideClipOverlay() {
    if (!clipOverlay) return;
    clipOverlay.classList.remove("open");
}


// 🔥 Single source of truth
const state = {
    lastQuery: "",
    lastEndMs: 0,
    busy: false,
    audioUnlocked: false
};

const CONFIG = {
    HLS_URL: "/public/hls/index.m3u8",
    API_BASE: "/api/search"
};

/* ================= STATUS ================= */

function setStatus(text) {
    status.textContent = text || "";
}

function setBusy(b) {
    state.busy = b;
    // Keep the input enabled so it doesn't lose focus while searching.
    // We only disable buttons to prevent double-submits.
    form.querySelectorAll("button").forEach((x) => (x.disabled = b));
}

function normalizeTerm(s) {
    return (s || "").trim();
}

/* ================= VIDEO ================= */

async function ensureMetadata() {
    if (video.readyState >= 1) return;
    await new Promise((resolve) =>
        video.addEventListener("loadedmetadata", resolve, { once: true })
    );
}

async function seekTo(sec) {
    // Seeking is async in many browsers (especially with HLS).
    // If we call play() immediately after setting currentTime, the seek may not
    // have been applied yet, leading to "black" playback or immediate clipend.
    await ensureMetadata();
    if (!Number.isFinite(sec)) return;

    const target = Math.max(0, sec);
    if (Math.abs(video.currentTime - target) < 0.05) return;

    await new Promise((resolve) => {
        let done = false;
        const onSeeked = () => {
            if (done) return;
            done = true;
            cleanup();
            resolve();
        };
        const timer = setTimeout(() => {
            if (done) return;
            done = true;
            cleanup();
            resolve();
        }, 2000);

        const cleanup = () => {
            clearTimeout(timer);
            video.removeEventListener("seeked", onSeeked);
        };

        video.addEventListener("seeked", onSeeked, { once: true });
        video.currentTime = target;
    });
}

async function playSpan(startMs, endMs) {
    await ensureMetadata();
    hideClipOverlay();
    // IMPORTANT: clear any previous stop before seeking.
    // If the previous stopAt is earlier than the new clip end (or we jump
    // backwards), the old timeupdate rule could immediately fire "clipend".
    setStopAt(video, null);
    video.pause();

    await seekTo(startMs / 1000);
    setStopAt(video, endMs / 1000);

    const played = await video.play().then(
        () => true,
        () => false
    );
    if (!played) {
        // Autoplay policies can reject play(), even if the backend/search works.
        // In that case we surface a clear CTA instead of failing silently.
        setStatus("Tap to enable playback");
        return;
    }

    forceSubtitlesOn(video);
}

/* ================= SEARCH ================= */

async function doSearch(term, isNext) {
    term = normalizeTerm(term);
    if (!term) return;

    if (!isNext || term !== state.lastQuery) {
        state.lastQuery = term;
        state.lastEndMs = 0;
    }

    setBusy(true);
    setStatus("Searching…");

    try {
        const afterMs = state.lastEndMs + 1;
        const { start_ms, end_ms } = await searchNext(
            CONFIG.API_BASE,
            term,
            afterMs
        );

        state.lastEndMs = end_ms;

        await playSpan(start_ms, end_ms);
        setStatus("");
    } catch {
        setStatus("Not found");
    } finally {
        setBusy(false);
    }
}

/* ================= AUTOPLAY ================= */

function bindAutoplayUnlock() {
    const unlock = async () => {
        if (state.audioUnlocked) return;
        state.audioUnlocked = true;
        unlockAutoplay(video);
        forceSubtitlesOn(video);
    };

    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("touchstart", unlock, {
        once: true,
        passive: true
    });
}

/* ================= FORM ================= */

function bindSearch() {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (state.busy) return;

        // Do NOT blur the input: keeping focus lets the user hit Enter repeatedly
        // to jump through multiple matches.
        await doSearch(input.value, true);
        return false;
    });
}

/* ================= DISCLAIMER ================= */

function bindLegalDisclaimer() {
    const openBtn = document.getElementById("open-legal");
    const closeBtn = document.getElementById("close-legal");
    const modal = document.getElementById("legal-modal");

    if (!openBtn || !closeBtn || !modal) return;

    openBtn.addEventListener("click", () => {
        modal.classList.add("open");
    });

    closeBtn.addEventListener("click", () => {
        modal.classList.remove("open");
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("open");
        }
    });
}

/* ================= BOOT ================= */

function bootstrap() {
    initPlayer(video, CONFIG.HLS_URL);
    lockDownVideoUI(video);

    bindAutoplayUnlock();
    bindSearch();
    bindLegalDisclaimer();

    video.addEventListener("loadedmetadata", () => {
        forceSubtitlesOn(video);
    });
    video.addEventListener("clipend", () => {
        // Non-blocking overlay: we show a small card on top of the video
        // to indicate the clip ended, but keep the search UI usable.
        showClipOverlay();
        setStatus("");
        // Let the UI settle, then focus the input
        setTimeout(() => input.focus(), 50);
    });

    clipOverlayBtn?.addEventListener("click", () => {
        hideClipOverlay();
        input.focus();
    });

    // Tap outside closes too
    clipOverlay?.addEventListener("click", (e) => {
        if (e.target === clipOverlay) {
            hideClipOverlay();
            input.focus();
        }
    });

}

bootstrap();
