import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { URL } from "node:url";

import { handleRoutes } from "./routes";
import { CONFIG } from "../core/config";
import { applyOffset } from "../core/utils";
import { buildIndex } from "../subtitles";
import { parseSrt } from "../subtitles/srt";

/**
 * Creates and starts the HTTP server.
 * Loads SRT on boot, builds an in-memory index, then serves /api/search.
 */
export function createApp() {
    const srt = readFileSync(CONFIG.SRT_PATH, "utf8");
    const cues = parseSrt(srt);
    applyOffset(cues, CONFIG.GLOBAL_OFFSET_MS);
    const index = buildIndex(cues);

    console.log(`[BOOT] project="Harry Potter Dialogues" cues=${cues.length}`);

    const server = createServer((req, res) => {
        const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

        res.setHeader("Access-Control-Allow-Origin", CONFIG.CORS_ORIGIN);

        const handled = handleRoutes(req, res, url, cues, index);
        if (!handled) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "not found" }));
        }
    });

    server.listen(CONFIG.PORT, () => {
        console.log(`[READY] http://localhost:${CONFIG.PORT}`);
    });
}
