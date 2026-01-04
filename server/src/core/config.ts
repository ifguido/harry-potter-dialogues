/**
 * Global configuration for the backend service.
 * Values can be overridden via environment variables.
 */
export const CONFIG = {
    PORT: Number(process.env.PORT ?? 8787),
    SRT_PATH: process.env.SRT_PATH ?? "./movie.srt",
    NEIGHBORS: Number(process.env.NEIGHBORS ?? 1),
    GLOBAL_OFFSET_MS: Number(process.env.GLOBAL_OFFSET_MS ?? 0),
    PAD_START_MS: Number(process.env.PAD_START_MS ?? 100),
    PAD_END_MS: Number(process.env.PAD_END_MS ?? 300),
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
} as const;

/**
 * Validates and normalizes configuration values.
 * Throws on invalid values to fail fast on boot.
 */
export function validateConfig() {
    if (!Number.isFinite(CONFIG.PORT) || CONFIG.PORT <= 0) throw new Error("Invalid PORT");
    if (!Number.isFinite(CONFIG.NEIGHBORS) || CONFIG.NEIGHBORS < 0) throw new Error("Invalid NEIGHBORS");
    if (!Number.isFinite(CONFIG.GLOBAL_OFFSET_MS)) throw new Error("Invalid GLOBAL_OFFSET_MS");
    if (!Number.isFinite(CONFIG.PAD_START_MS) || CONFIG.PAD_START_MS < 0) throw new Error("Invalid PAD_START_MS");
    if (!Number.isFinite(CONFIG.PAD_END_MS) || CONFIG.PAD_END_MS < 0) throw new Error("Invalid PAD_END_MS");
}
