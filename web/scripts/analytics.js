// Firebase Analytics (GA4 via Firebase)
// - Safe-by-default: fails silently if unsupported.
// - Does not affect search (search always targets English subtitles).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAnalytics,
    logEvent,
    isSupported
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyC3tPs9ccnYRqitqWkbjAMs0HtqgogeQcI",
    authDomain: "harry-potter-dialogues.firebaseapp.com",
    projectId: "harry-potter-dialogues",
    storageBucket: "harry-potter-dialogues.firebasestorage.app",
    messagingSenderId: "595671238496",
    appId: "1:595671238496:web:60fc6c6f208432df8f0005",
    measurementId: "G-L4D4Z91QF2"
};

let analytics = null;
let initPromise = null;

async function initAnalytics() {
    if (analytics) return analytics;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            // Respect Do Not Track when enabled.
            if (navigator.doNotTrack === "1") return null;

            const supported = await isSupported();
            if (!supported) return null;

            const app = initializeApp(firebaseConfig);
            analytics = getAnalytics(app);
            return analytics;
        } catch {
            // Analytics must never break playback/search UI.
            return null;
        }
    })();

    return initPromise;
}

/**
 * Logs a GA4 event via Firebase Analytics.
 * Safe to call anytime: if analytics isn't available, it's a no-op.
 */
export async function track(eventName, params) {
    try {
        const a = await initAnalytics();
        if (!a) return;
        logEvent(a, String(eventName), params || {});
    } catch {
        // no-op
    }
}

// Kick off initialization early.
initAnalytics();
