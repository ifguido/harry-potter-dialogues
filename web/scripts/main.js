import { initPlayer, lockDownVideoUI, forceSubtitlesOn, unlockAutoplay, setStopAt } from "./player.js";
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

let lastQuery;
let lastEndMs;


const CONFIG = {
    HLS_URL: "/public/hls/index.m3u8",
    API_BASE: "/api/search"
};

const state = {
    lastQuery: "",
    lastEndMs: 0,
    busy: false,
    audioUnlocked: false
};

function setStatus(text) {
    status.textContent = text || "";
}

function setBusy(b) {
    state.busy = b;
    form.querySelectorAll("button, input").forEach((x) => (x.disabled = b));
}

function normalizeTerm(s) {
    return (s || "").trim();
}

async function ensureMetadata() {
    if (video.readyState >= 1) return;
    await new Promise((resolve) => video.addEventListener("loadedmetadata", resolve, { once: true }));
}

async function playSpan(startMs, endMs) {
    await ensureMetadata();
    setStopAt(video, endMs / 1000);
    video.currentTime = startMs / 1000;
    await video.play().catch(() => { });
    forceSubtitlesOn(video);
}

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
        const { start_ms, end_ms } = await searchNext(CONFIG.API_BASE, term, afterMs);

        state.lastEndMs = end_ms;

        await playSpan(start_ms, end_ms);
        setStatus("");
    } catch {
        setStatus("Not found");
    } finally {
        setBusy(false);
    }
}

function bindAutoplayUnlock() {
    const unlock = async () => {
        if (state.audioUnlocked) return;
        state.audioUnlocked = true;
        unlockAutoplay(video);
        forceSubtitlesOn(video);
    };

    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true, passive: true });
}

function bindSearch() {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const term = input.value.trim();
        if (!term) return;

        // 🔑 solo resetear si cambió la query
        if (term !== lastQuery) {
            lastQuery = term;
            lastEndMs = 0;
        }

        try {
            const res = await fetch(
                `/api/search?q=${encodeURIComponent(term)}&after_ms=${lastEndMs + 1}`
            );

            if (!res.ok) throw new Error("not found");

            const { start_ms, end_ms } = await res.json();

            lastEndMs = end_ms;

            video.currentTime = start_ms / 1000;
            clipEndSec = end_ms / 1000;
            await video.play().catch(() => { });
        } catch {
            showToast("No encontrado");
        }

        return false;
    });


    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            // form submit handles it
        }
    });
}

function bootstrap() {
    initPlayer(video, CONFIG.HLS_URL);
    lockDownVideoUI(video);
    bindAutoplayUnlock();
    bindSearch();

    video.addEventListener("loadedmetadata", () => {
        forceSubtitlesOn(video);
    });
}

bootstrap();
