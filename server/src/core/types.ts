/**
 * Represents a subtitle cue extracted from an SRT file.
 */
export interface Cue {
    id: number;
    start_ms: number;
    end_ms: number;
    text: string;
    text_norm: string;
    tokens: string[];
}

/**
 * Maps a token to a list of cue indices in the cues array.
 */
export type TokenIndex = Map<string, number[]>;

/**
 * Represents a time span (milliseconds) used for seeking and clipping.
 */
export interface Span {
    start_ms: number;
    end_ms: number;
}

/**
 * API response returned by /api/search.
 */
export interface SearchResponse extends Span { }
