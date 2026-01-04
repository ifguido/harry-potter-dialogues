import { CONFIG } from "../core/config";
import { Cue, TokenIndex, SearchResponse } from "../core/types";
import { normalize } from "../core/utils";
import { pickRarestToken } from "./index";

/**
 * Adds padding before/after a span so playback starts earlier and ends later.
 */
function withPadding(start_ms: number, end_ms: number): SearchResponse {
    return {
        start_ms: Math.max(0, start_ms - CONFIG.PAD_START_MS),
        end_ms: end_ms + CONFIG.PAD_END_MS,
    };
}

/**
 * Builds a normalized joined text for cues[a..b] and a mapping from character index to cue index.
 * This lets us map a substring match back to the exact cue range involved.
 */
function buildJoinedTextWithMap(cues: Cue[], a: number, b: number) {
    let text = "";
    const map: { cueIndex: number; startChar: number; endChar: number }[] = [];

    for (let i = a; i <= b; i++) {
        const startChar = text.length;
        if (text.length) text += " ";
        text += cues[i].text_norm;
        const endChar = text.length;

        map.push({ cueIndex: i, startChar, endChar });
    }

    return { text, map };
}

/**
 * Given a match [pos..pos+len) in joined text, returns the first and last cue indices that overlap it.
 */
function matchToCueRange(
    map: { cueIndex: number; startChar: number; endChar: number }[],
    pos: number,
    len: number
) {
    const matchStart = pos;
    const matchEnd = pos + len;

    let first: number | null = null;
    let last: number | null = null;

    for (const seg of map) {
        const overlaps =
            seg.endChar > matchStart && seg.startChar < matchEnd;
        if (!overlaps) continue;

        if (first === null) first = seg.cueIndex;
        last = seg.cueIndex;
    }

    return first === null || last === null ? null : { first, last };
}

/**
 * Searches for a query using:
 * - token index to narrow candidate cues
 * - normalized substring matching over a cue window
 * - after_ms to support "next match" queries
 *
 * Returns the tightest cue span that contains the match (not the whole window).
 */
export function search(
    cues: Cue[],
    index: TokenIndex,
    query: string,
    after_ms: number
): SearchResponse | null {
    const qNorm = normalize(query);
    const qTokens = qNorm.split(" ").filter(Boolean);
    if (!qTokens.length) return null;

    const anchor = pickRarestToken(index, qTokens);
    if (!anchor) return null;

    const candidates = index.get(anchor) ?? [];
    for (const cueIdx of candidates) {
        // Define search window (still useful for cross-cue phrases)
        const a = Math.max(0, cueIdx - CONFIG.NEIGHBORS);
        const b = Math.min(cues.length - 1, cueIdx + CONFIG.NEIGHBORS);

        // Quick reject based on time
        if (cues[b].end_ms <= after_ms) continue;

        const { text, map } = buildJoinedTextWithMap(cues, a, b);

        const pos = text.indexOf(qNorm);
        if (pos === -1) continue;

        const range = matchToCueRange(map, pos, qNorm.length);
        if (!range) continue;

        const start_ms = cues[range.first].start_ms;
        const end_ms = cues[range.last].end_ms;

        if (end_ms <= after_ms) continue;

        return withPadding(start_ms, end_ms);
    }

    return null;
}
