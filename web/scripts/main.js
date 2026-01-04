import {
    initPlayer,
    lockDownVideoUI,
    forceSubtitlesOn,
    unlockAutoplay,
    setStopAt
} from "./player.js";
import { searchNext } from "./api.js";
import { applyI18n, getLanguage, setLanguage, t } from "./i18n.js";
import { track } from "./analytics.js";

function mustGet(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element #${id}`);
    return el;
}

const video = /** @type {HTMLVideoElement} */ (mustGet("video"));
const form = /** @type {HTMLFormElement} */ (mustGet("form"));
const input = /** @type {HTMLInputElement} */ (mustGet("query"));
const status = mustGet("status");
const subs = document.getElementById("subs");
const langSelect = /** @type {HTMLSelectElement | null} */ (
    document.getElementById("lang")
);

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

const DEFAULT_QUERY = "harry potter";

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

/* ================= SUBTITLES (CUSTOM OVERLAY) ================= */

function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(rawText, query) {
    const text = String(rawText || "");
    const term = normalizeTerm(query);
    if (!term) return escapeHtml(text);

    // Prefer highlighting the full query (phrase). If it doesn't appear, fall back to tokens.
    const full = new RegExp(escapeRegExp(term), "gi");
    if (full.test(text)) {
        return escapeHtml(text).replace(full, (m) => `<span class="hl">${escapeHtml(m)}</span>`);
    }

    const tokens = term
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);

    if (!tokens.length) return escapeHtml(text);

    // Highlight longer tokens first to avoid partial overlaps.
    tokens.sort((a, b) => b.length - a.length);
    const tokenRe = new RegExp(tokens.map(escapeRegExp).join("|"), "gi");

    return escapeHtml(text).replace(tokenRe, (m) => `<span class="hl">${escapeHtml(m)}</span>`);
}

function pickSubtitleTrack() {
    const tracks = Array.from(video.textTracks || []);
    return (
        tracks.find((t) => t.kind === "subtitles" || t.kind === "captions") ||
        tracks[0] ||
        null
    );
}

function initSubtitleOverlay() {
    if (!subs) return;

    const track = pickSubtitleTrack();
    if (!track) return;

    // Hide native subtitle rendering and drive our own overlay.
    // This makes highlighting consistent across browsers.
    track.mode = "hidden";

    const render = () => {
        const cues = track.activeCues;
        if (!cues || cues.length === 0) {
            subs.textContent = "";
            return;
        }

        // Join active cues (some subtitle formats can overlap).
        const joined = Array.from(cues)
            .map((c) => ("text" in c ? c.text : ""))
            .filter(Boolean)
            .join("\n");

        subs.innerHTML = highlightText(joined, state.lastQuery);
    };

    track.addEventListener("cuechange", render);
    render();
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
        setStatus(t("status.tapToPlay"));
        return;
    }

    // Native subtitles are kept hidden; we render subtitles via the overlay.
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
    setStatus(t("status.searching"));

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

        // Analytics: track successful searches.
        // Note: search always targets English dialogues; this tracks what the user typed.
        track("search", {
            ui_lang: getLanguage(),
            query: term.slice(0, 80),
            query_len: term.length,
            is_next: Boolean(isNext),
            after_ms: afterMs,
            start_ms,
            end_ms
        });
    } catch {
        setStatus(t("status.notFound"));

        // Analytics: track failed searches.
        track("search_not_found", {
            ui_lang: getLanguage(),
            query: term.slice(0, 80),
            query_len: term.length,
            is_next: Boolean(isNext)
        });
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
        // Subtitles overlay is independent from autoplay unlock.
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

/* ================= DEFAULT SEARCH (TYPEWRITER) ================= */

function requestSearchSubmit() {
    if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
        return;
    }
    // Fallback for older browsers.
    form.dispatchEvent(new Event("submit", { cancelable: true }));
}

function autoTypeAndSearchDefault() {
    // Only run if the user hasn't started typing.
    if (normalizeTerm(input.value)) return;

    const text = DEFAULT_QUERY;
    const keyDelayMs = 85;
    const afterDelayMs = 150;

    let cancelled = false;
    let timer = null;
    let submitTimer = null;
    let i = 0;

    const cancel = () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        if (submitTimer) clearTimeout(submitTimer);
        cleanupListeners();
        // If the user interrupted before typing finished, avoid leaving partial text.
        if (input.value !== text) input.value = "";
    };

    const cleanupListeners = () => {
        window.removeEventListener("keydown", cancel, true);
        window.removeEventListener("pointerdown", cancel, true);
        input.removeEventListener("input", cancel, true);
    };

    window.addEventListener("keydown", cancel, { once: true, capture: true });
    window.addEventListener("pointerdown", cancel, { once: true, capture: true });
    input.addEventListener("input", cancel, { once: true, capture: true });

    const tick = () => {
        if (cancelled) return;
        input.value = text.slice(0, i);
        i += 1;

        if (i <= text.length) {
            timer = setTimeout(tick, keyDelayMs);
            return;
        }

        submitTimer = setTimeout(() => {
            if (cancelled) return;
            requestSearchSubmit();
        }, afterDelayMs);
        cleanupListeners();
    };

    tick();
}

/* ================= BOOT ================= */

function bootstrap() {
    // i18n boot:
    // UI language can be EN/ES/PT, but search ALWAYS targets English dialogues.
    // We translate only interface strings, never the query.
    applyI18n(document, getLanguage());
    if (langSelect) {
        langSelect.value = getLanguage();
        langSelect.addEventListener("change", () => {
            const next = setLanguage(langSelect.value);
            langSelect.value = next;
        });
    }

    initPlayer(video, CONFIG.HLS_URL);
    lockDownVideoUI(video);

    bindAutoplayUnlock();
    bindSearch();
    bindLegalDisclaimer();

    // Start with a default search.
    autoTypeAndSearchDefault();

    video.addEventListener("loadedmetadata", () => {
        initSubtitleOverlay();
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
