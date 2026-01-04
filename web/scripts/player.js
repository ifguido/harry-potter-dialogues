/**
 * Initializes video playback with HLS.
 * - Uses native HLS if the browser supports it (Safari).
 * - Falls back to Hls.js if available and supported.
 */
export function initPlayer(video, hlsUrl) {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsUrl;
        return;
    }

    if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        return;
    }

    console.warn("HLS is not supported in this browser.");
}

/**
 * Disables common UI/UX paths to download or cast the content.
 * This is not DRM; it just reduces obvious browser controls.
 */
export function lockDownVideoUI(video) {
    video.controls = false;
    video.disablePictureInPicture = true;
    video.setAttribute("controlsList", "nodownload noplaybackrate noremoteplayback");
    video.addEventListener("contextmenu", (e) => e.preventDefault());
}

/**
 * Forces subtitle tracks to be visible.
 * Some browsers ignore the 'default' attribute on <track>.
 */
export function forceSubtitlesOn(video) {
    try {
        for (const t of video.textTracks) t.mode = "showing";
    } catch { }
}


let clipEndSec = null;
let boundVideo = null;

/**
 * Sets an end time (in seconds) where playback should stop.
 * It attaches a single timeupdate listener per video element.
 */
export function setStopAt(video, endSec) {
    clipEndSec = endSec;

    if (boundVideo === video) return;
    boundVideo = video;

    video.addEventListener("timeupdate", () => {
        if (clipEndSec == null) return;
        if (video.currentTime >= clipEndSec) {
            video.currentTime = clipEndSec;
            video.pause();
        }
    });
}

/**
 * Attempts to start playback with audio after a real user gesture.
 * This is required by autoplay policies in modern browsers.
 */
export function unlockAutoplay(video) {
    video.muted = false;
    video.playsInline = true;
    video.play().catch(() => { });
}