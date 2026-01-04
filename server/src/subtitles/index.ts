import { Cue, TokenIndex } from "../core/types";

/**
 * Builds an inverted index: token -> list of cue indices.
 * Uses unique tokens per cue to reduce duplicates.
 */
export function buildIndex(cues: Cue[]): TokenIndex {
    const m: TokenIndex = new Map();

    cues.forEach((cue, cueIndex) => {
        const unique = new Set(cue.tokens);
        for (const token of unique) {
            const arr = m.get(token);
            if (arr) arr.push(cueIndex);
            else m.set(token, [cueIndex]);
        }
    });

    return m;
}

/**
 * Chooses the rarest token from the query to minimize candidate scanning.
 * Returns null if tokens are empty or unusable.
 */
export function pickRarestToken(index: TokenIndex, tokens: string[]) {
    let best: string | null = null;
    let bestLen = Infinity;

    for (const t of tokens) {
        const len = index.get(t)?.length ?? Infinity;
        if (len < bestLen) {
            best = t;
            bestLen = len;
        }
    }

    return best;
}
