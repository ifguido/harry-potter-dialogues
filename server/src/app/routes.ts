
import { Cue, TokenIndex } from "../core/types";
import { sendJson } from "../core/utils";
import { search } from "../subtitles/search";

/**
 * Handles routing for all HTTP requests.
 * Returns true if the request was handled, false otherwise.
 */
export function handleRoutes(
    req: any,
    res: any,
    url: URL,
    cues: Cue[],
    index: TokenIndex
) {
    if (url.pathname === "/api/health") {
        sendJson(res, 200, { ok: true });
        return true;
    }

    if (url.pathname === "/api/search") {
        const q = (url.searchParams.get("q") ?? "").trim();
        const after_ms = Number(url.searchParams.get("after_ms") ?? 0);

        if (!q) {
            sendJson(res, 400, { error: "missing q" });
            return true;
        }

        if (!Number.isFinite(after_ms) || after_ms < 0) {
            sendJson(res, 400, { error: "invalid after_ms" });
            return true;
        }

        const result = search(cues, index, q, after_ms);
        if (!result) {
            sendJson(res, 404, { error: "not found" });
            return true;
        }

        sendJson(res, 200, result);
        return true;
    }

    return false;
}
