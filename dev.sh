#!/usr/bin/env bash
set -euo pipefail

echo "▶️  Starting Harry Potter Dialogues (dev)"

# Ports
BACK_PORT="${BACK_PORT:-8787}"
FRONT_PORT="${FRONT_PORT:-5173}"

# Paths (adjust if you move things)
SERVER_DIR="${SERVER_DIR:-server}"
WEB_DIR="${WEB_DIR:-web}"
MEDIA_DIR="${MEDIA_DIR:-media}"

SRT_PATH="${SRT_PATH:-$MEDIA_DIR/movie.srt}"

# Kill whatever is listening on a TCP port (best-effort)
kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti tcp:"$port" || true)"
  if [[ -n "${pids}" ]]; then
    echo "🧹 Killing processes on port ${port}: ${pids}"
    kill ${pids} 2>/dev/null || true
    sleep 0.2
    # If still alive, force kill
    pids="$(lsof -ti tcp:"$port" || true)"
    if [[ -n "${pids}" ]]; then
      kill -9 ${pids} 2>/dev/null || true
    fi
  fi
}

cleanup() {
  echo ""
  echo "🛑 Stopping dev environment..."
  # Kill all background jobs started by this script
  jobs -p | xargs -r kill 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "🧹 Cleaning ports"
kill_port "${BACK_PORT}"
kill_port "${FRONT_PORT}"

# Basic sanity checks (fail fast)
if [[ ! -f "${SRT_PATH}" ]]; then
  echo "❌ Missing subtitles file: ${SRT_PATH}"
  echo "   Put your SRT at media/movie.srt or set SRT_PATH=/path/to/file.srt"
  exit 1
fi

if [[ ! -d "${WEB_DIR}" ]]; then
  echo "❌ Missing web directory: ${WEB_DIR}"
  exit 1
fi

if [[ ! -d "${SERVER_DIR}" ]]; then
  echo "❌ Missing server directory: ${SERVER_DIR}"
  exit 1
fi

echo "🧠 Backend (SRT search) on :${BACK_PORT}"
(
  cd "${SERVER_DIR}"
  PORT="${BACK_PORT}" SRT_PATH="../${SRT_PATH}" npx tsx src/server.ts
) &

echo "🖥️  Frontend (static) on :${FRONT_PORT}"
(
  cd "${WEB_DIR}"
  python3 -m http.server "${FRONT_PORT}"
) &

echo ""
echo "✅ READY"
echo "• Web     : http://localhost:${FRONT_PORT}/"
echo "• Backend : http://localhost:${BACK_PORT}/api/search?q=harry"
echo ""
echo "Notes:"
echo "• The frontend expects HLS at /public/hls/index.m3u8 and subtitles at /public/movie.vtt"
echo "• Ctrl+C stops everything"
echo ""

wait
