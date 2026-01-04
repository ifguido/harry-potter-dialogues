/**
 * Sends a JSON response with proper headers and status code.
 */
export function sendJson(res: any, code: number, body: unknown) {
    res.statusCode = code;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
}

/**
 * Normalizes text for search by:
 * - lowercasing
 * - removing diacritics
 * - keeping only unicode letters/digits
 * - collapsing whitespace
 */
export function normalize(text: string) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Applies a global offset to all cue timestamps.
 * Useful when subtitles are systematically shifted relative to the video.
 */
export function applyOffset(cues: { start_ms: number; end_ms: number }[], offsetMs: number) {
    if (!offsetMs) return;
    for (const c of cues) {
        c.start_ms += offsetMs;
        c.end_ms += offsetMs;
    }
}
