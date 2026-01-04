
# Harry Potter Dialogues

🔮 **Harry Potter Dialogues** is a web application that lets you search for any word or phrase and instantly jump to the exact moment in the movie where that dialogue is spoken.

Live demo:
👉 **[https://harrypotterdialogues.com/](https://harrypotterdialogues.com/)**

The project is intentionally simple, fast, and transparent: no AI models, no embeddings, no heavy databases — just subtitles, timestamps, and video streaming done right.

---

## What does this project do?

* You type a word or phrase (e.g. *“You’re a wizard”*)
* The backend searches subtitle cues in memory
* It returns `{ start_ms, end_ms }`
* The frontend seeks the video to that exact moment and plays the scene

There are **no pre-generated clips**.
Playback is done via **HLS seek on a single video stream**.

---

## High-level architecture

```
[SRT subtitles] --> parsed into cues --> indexed in RAM
                                   \
                                    --> HTTP search API
                                           |
                                           v
                                   Frontend seeks HLS video
```

### Key design decisions

* **Subtitles are the source of truth**
* **Everything is in memory** (fast, predictable)
* **HLS streaming** instead of slicing videos
* **Stateless backend** (restart = reindex subtitles)

---

## Why HLS?

**HLS (HTTP Live Streaming)** allows:

* Seeking to any timestamp without creating video clips
* Streaming large video files efficiently
* Compatibility with Safari (native) and all modern browsers (via hls.js)
* One single video source for all searches

Instead of generating thousands of clips, we:

* Stream the full movie as HLS
* Jump to the right timestamp on demand

This keeps storage, complexity, and latency low.

---

## Backend overview

* **Node.js + TypeScript**
* Loads one `.srt` file on boot
* Parses it into cues
* Builds an inverted index in RAM:

  ```
  token -> [cueIndex, cueIndex, ...]
  ```
* Search algorithm:

  * Normalize query
  * Pick the rarest token
  * Scan nearby cues
  * Return the first match after `after_ms`

### Memory usage

* Subtitles only
* No database
* No disk reads after startup
* Typical usage: a few MB

---

## Frontend overview

* Plain HTML / CSS / JavaScript
* No framework, no build step
* Uses:

  * `<video>` with HLS
  * `fetch()` to query the backend
* Supports repeated searches:

  * Same query → next occurrence in the movie

---

## Running the project locally

### Requirements

* Node.js 18+
* `ffmpeg`
* A movie file (`.mp4`) and subtitles (`.srt`)

---

## Step 1: Prepare the media

Create a `media/` folder (this is **not committed to git**):

```
media/
  movie.mp4
  movie.srt
```

### 1.1 Decompress movie (if needed)

If your movie is compressed (e.g. `.rar`):

```bash
unrar x movie.rar
```

You should end up with a playable `.mp4`.

---

## Step 2: Convert subtitles (SRT → VTT)

Browsers do **not** support SRT directly.

Convert subtitles to VTT:

```bash
ffmpeg -i media/movie.srt media/movie.vtt
```

---

## Step 3: Generate HLS from the movie

HLS splits the movie into small `.ts` segments plus a `.m3u8` playlist.

```bash
mkdir -p media/hls

ffmpeg -i media/movie.mp4 \
  -c:v h264 -c:a aac \
  -hls_time 4 \
  -hls_playlist_type vod \
  -hls_segment_filename "media/hls/seg_%03d.ts" \
  media/hls/index.m3u8
```

This creates:

```
media/hls/
  index.m3u8
  seg_000.ts
  seg_001.ts
  ...
```

---

## Step 4: Frontend static files

The frontend expects:

```
web/
  public/
    movie.vtt
    hls/
      index.m3u8
      seg_*.ts
```

Copy the files:

```bash
cp media/movie.vtt web/public/movie.vtt
mkdir -p web/public/hls
cp -R media/hls/* web/public/hls/
```

---

## Step 5: Run the backend

From `server/`:

```bash
npm install
SRT_PATH=../media/movie.srt npm run dev
```

The backend will:

* Load the SRT
* Index all cues in memory
* Start listening on `http://localhost:8787`

---

## Step 6: Run the frontend

Serve the frontend with any static server:

```bash
cd web
python3 -m http.server 5173
```

Open:

👉 `http://localhost:5173`

---

## Subtitle alignment (important)

Subtitles and video **are often slightly misaligned**.

This project supports two ways to fix that:

### 1. Runtime offset (frontend)

There is an `offset_ms` input in the UI.

* Positive → subtitles are early
* Negative → subtitles are late

This lets you fine-tune alignment **without restarting anything**.

### 2. Global offset (backend)

You can also set:

```bash
GLOBAL_OFFSET_MS=500
```

This permanently shifts all cue timestamps on boot.

---

## Limitations (by design)

* One movie at a time
* One subtitle file at a time
* No authentication
* No DRM
* No fuzzy AI search (exact normalized substring match)

This is intentional.
The goal is **speed, clarity, and control**, not scale.

---

## Why this exists

This project was built to explore:

* Precise subtitle-based seeking
* Low-latency video navigation
* Minimal backend design
* Real-time search without AI overhead

It’s a **technical experiment**, not a product.

---

## License

Personal project.
The code is provided for educational purposes.
Movie files are **not included** and must be legally obtained by the user.

## DigitalOcean – Server management

The production server runs on a DigitalOcean droplet using **systemd** for the backend and **nginx** as the web server.

### Restart backend (Node / SRT search)

```bash
sudo systemctl restart harry-potter-dialogues-backend
```

Check status and logs:

```bash
sudo systemctl status harry-potter-dialogues-backend --no-pager
journalctl -u harry-potter-dialogues-backend -f
```

---

### Reload / restart nginx

After changing frontend files or nginx config:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Full restart (only if needed):

```bash
sudo systemctl restart nginx
```

Check status:

```bash
sudo systemctl status nginx --no-pager
```

---

### Restart everything (quick recovery)

```bash
sudo systemctl restart harry-potter-dialogues-backend
sudo systemctl restart nginx
```

---

### Useful diagnostics

Check which ports are in use:

```bash
sudo ss -ltnp
```

Check recent nginx errors:

```bash
sudo tail -n 200 /var/log/nginx/error.log
```

---
