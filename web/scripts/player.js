export function initPlayer(video, hlsUrl) {
    // Safari: HLS nativo
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsUrl;
        return;
    }

    // Otros browsers: Hls.js
    if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        return;
    }

    // Si no hay soporte
    console.warn("HLS not supported in this browser");
}

export function forceSubsOn(video) {
    try {
        for (const t of video.textTracks) t.mode = "showing";
    } catch { }
}

export function unlockAutoplay(video) {
    video.muted = false;
    video.play().catch(() => { });
}

let clipEndSec = null;
let boundVideo = null;

export function setStopAt(video, endSec) {
    clipEndSec = endSec;

    // bind una sola vez por video
    if (boundVideo === video) return;
    boundVideo = video;

    video.addEventListener("timeupdate", () => {
        if (clipEndSec == null) return;
        if (video.currentTime >= clipEndSec) {
            video.currentTime = clipEndSec;
            video.pause(); // consistente entre browsers
        }
    });
}
