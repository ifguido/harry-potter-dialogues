
import { createApp } from "./app/http";
import { validateConfig } from "./core/config";


/**
 * Entry point for the Harry Potter Dialogues backend.
 * Validates configuration and starts the HTTP server.
 */
function main() {
  validateConfig();
  createApp();
}

main();
