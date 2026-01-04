import { Cue } from "../core/types";
import { normalize } from "../core/utils";

/**
 * Parses an SRT timestamp (HH:MM:SS,mmm) or (HH:MM:SS.mmm) into milliseconds.
 * Returns NaN if the format is invalid.
 */
export function toMs(ts: string) {
    const clean = ts.trim().replace(",", ".");
    const parts = clean.split(":");
    if (parts.length !== 3) return NaN;

    const [h, m, s] = parts;
    const secParts = s.split(".");
    const sec = Number(secParts[0] ?? "");
    const msRaw = (secParts[1] ?? "0").padEnd(3, "0").slice(0, 3);
    const ms = Number(msRaw);

    const hh = Number(h);
    const mm = Number(m);

    if (![hh, mm, sec, ms].every(Number.isFinite)) return NaN;
    return (hh * 3600 + mm * 60 + sec) * 1000 + ms;
}

/**
 * Parses SRT content into an array of cues.
 * This parser is tolerant and skips malformed blocks.
 */
export function parseSrt(input: string): Cue[] {
    const blocks = input.replace(/\r/g, "").split(/\n\n+/);
    const cues: Cue[] = [];

    for (const block of blocks) {
        const lines = block.split("\n").filter(Boolean);
        if (lines.length < 2) continue;

        const timeLine = lines.find((l) => l.includes("-->"));
        if (!timeLine) continue;

        const [a, b] = timeLine.split("-->").map((s) => s.trim());
        const start_ms = toMs(a);
        const end_ms = toMs(b);
        if (!Number.isFinite(start_ms) || !Number.isFinite(end_ms)) continue;

        const text = lines.slice(lines.indexOf(timeLine) + 1).join(" ");
        const norm = normalize(text);

        cues.push({
            id: cues.length,
            start_ms,
            end_ms,
            text,
            text_norm: norm,
            tokens: norm.split(" ").filter(Boolean),
        });
    }

    return cues;
}
