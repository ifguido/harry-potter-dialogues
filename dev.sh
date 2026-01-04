#!/usr/bin/env bash
set -e

echo "▶️  Starting SubtiShow dev environment"

# Ports
HLS_PORT=5173
BACK_PORT=8787
FRONT_PORT=3000

# Kill previous servers on those ports (opcional pero práctico)
kill_port () {
  lsof -ti tcp:$1 | xargs -r kill -9
}

echo "🧹 Cleaning ports"
kill_port $HLS_PORT
kill_port $BACK_PORT
kill_port $FRONT_PORT

echo "🎬 HLS server on :$HLS_PORT"
(cd hls && python3 -m http.server $HLS_PORT) &

echo "🧠 Backend (SRT search) on :$BACK_PORT"
SRT_PATH=./movie.srt PORT=$BACK_PORT npx tsx server.ts &

echo "🖥️  Frontend on :$FRONT_PORT"
python3 -m http.server $FRONT_PORT &

echo ""
echo "✅ READY"
echo "• Frontend: http://localhost:$FRONT_PORT/index.html"
echo "• Backend : http://localhost:$BACK_PORT/api/search?q=harry"
echo "• HLS     : http://localhost:$HLS_PORT/index.m3u8"
echo ""
echo "⏹  Ctrl+C to stop all"

wait
