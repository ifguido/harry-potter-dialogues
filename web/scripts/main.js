import "./styles.css";
import { initPlayer, setStopAt, forceSubsOn, unlockAutoplay } from "./player.js";
import { searchNext } from "./api.js";
import { showToast } from "./ui.js";

const video = document.getElementById("video");
const form = document.getElementById("form");
const input = document.getElementById("query");
const offsetInput = document.getElementById("offset");

// Rutas relativas (mismo origin). En dev, Vite proxy manda /api al server.
const HLS_URL = "/hls/index.m3u8";
const API_BASE = "/api/search";

// init playback
initPlayer(video, HLS_URL);

// lock down UI (sin controls)
video.controls = false;
video.disablePictureInPicture = true;
video.setAttribute("controlsList", "nodownload noplaybackrate noremoteplayback");
video.addEventListener("contextmenu", (e) => e.preventDefault());

// autoplay policies: arrancamos muted y se “desbloquea” con interacción real
document.addEventListener(
    "pointerdown",
    () => {
        unlockAutoplay(video);
        forceSubsOn(video);
    },
    { once: true }
);

// “otra escena” en búsquedas repetidas
let lastQuery = "";
let lastEndMs = 0;

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const term = input.value.trim();
    if (!term) return;

    if (term !== lastQuery) {
        lastQuery = term;
        lastEndMs = 0;
    }

    const offsetMs = Number(offsetInput.value || 0);

    try {
        const { start_ms, end_ms } = await searchNext(API_BASE, term, lastEndMs + 1, offsetMs);
        lastEndMs = end_ms;

        // stop-at + seek
        setStopAt(video, end_ms / 1000);
        await video.play().catch(() => { });
        video.currentTime = start_ms / 1000;

        // best-effort play + subs
        await video.play().catch(() => { });
        forceSubsOn(video);
    } catch {
        showToast("No encontrado");
    }
});

// por si el track carga tarde
video.addEventListener("loadedmetadata", () => forceSubsOn(video));
