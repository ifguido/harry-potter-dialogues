import { CONFIG } from "../core/config";
import { Cue, Span, TokenIndex, SearchResponse } from "../core/types";
import { normalize } from "../core/utils";
import { pickRarestToken } from "./index";

/**
 * Computes the time span for a cue window around index i.
 */
function windowSpan(cues: Cue[], i: number): Span {
    const a = Math.max(0, i - CONFIG.NEIGHBORS);
    const b = Math.min(cues.length - 1, i + CONFIG.NEIGHBORS);
    return { start_ms: cues[a].start_ms, end_ms: cues[b].end_ms };
}

/**
 * Builds the normalized text for a cue window around index i.
 * This allows matching phrases that span multiple cues.
 */
function windowText(cues: Cue[], i: number) {
    const a = Math.max(0, i - CONFIG.NEIGHBORS);
    const b = Math.min(cues.length - 1, i + CONFIG.NEIGHBORS);
    return cues.slice(a, b + 1).map((c) => c.text_norm).join(" ");
}

/**
 * Adds padding before/after a span so playback starts earlier and ends later.
 */
function withPadding(span: Span): SearchResponse {
    return {
        start_ms: Math.max(0, span.start_ms - CONFIG.PAD_START_MS),
        end_ms: span.end_ms + CONFIG.PAD_END_MS,
    };
}

/**
 * Searches for a query using:
 * - token index to narrow candidate cues
 * - normalized substring matching over a cue window
 * - after_ms to support "next match" queries
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
        const span = windowSpan(cues, cueIdx);
        if (span.end_ms <= after_ms) continue;

        const text = windowText(cues, cueIdx);
        if (text.includes(qNorm)) {
            return withPadding(span);
        }
    }

    return null;
}
