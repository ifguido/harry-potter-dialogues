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



// We keep stopAt state at module level.
// Reason: setStopAt() can be called many times (every search).
// If we create a new function each time and try to remove it, we end up not
// removing the previous listener (different function identity) and stack
// many timeupdate listeners -> buggy playback.
let stopAtSec = null;
let stopAtVideo = null;
let stopAtHandler = null;

/**
 * Sets a hard stop time for the current clip.
 * When reached, the video pauses, clamps to the end, clears the stop,
 * and dispatches a "clipend" event.
 */
export function setStopAt(video, endSec) {
    stopAtSec = Number.isFinite(endSec) ? endSec : null;

    // Attach exactly one timeupdate handler per video element.
    // We only re-bind if the video element instance changes.
    if (stopAtVideo !== video) {
        if (stopAtVideo && stopAtHandler) {
            stopAtVideo.removeEventListener("timeupdate", stopAtHandler);
        }

        stopAtVideo = video;
        stopAtHandler = () => {
            if (stopAtSec == null) return;
            if (!stopAtVideo) return;

            if (stopAtVideo.currentTime >= stopAtSec) {
                // Hard stop (prevents the "stuck" loop)
                stopAtVideo.pause();
                stopAtVideo.currentTime = stopAtSec;
                stopAtSec = null;
                stopAtVideo.dispatchEvent(new CustomEvent("clipend"));
            }
        };

        stopAtVideo.addEventListener("timeupdate", stopAtHandler);
    }
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