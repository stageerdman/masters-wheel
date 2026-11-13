# Call Coach — v1 (prototype / spike)

## Goal

A throwaway toy to test one idea before it ever touches Master's Wheel:
while I'm on a live sales call, show three questions I should ask, notice
when I've asked one (in my own words, not verbatim), then suggest three
more, for five rounds. The point is to measure two things:

1. how fast live transcription keeps up with my speech, and
2. how fast and how well "did they ask it?" detection works on loose
   paraphrases.

This is a research spike, so it lives entirely in this update folder
(`prototype/`), outside the app's code and element conventions. It's not
an overlay yet, just a page.

## How to run

Double-click `prototype/start.command` (or `node prototype/server.mjs`).
It starts a local server on http://localhost:4870 and opens the browser.
Press Start and allow the microphone. Needs `ELEVENLABS_API_KEY` in the
project `.env` and a logged-in `claude` CLI.

## Phases

### Phase 1: Pipeline + UI
- `server.mjs` (zero npm deps): mints single-use ElevenLabs realtime
  tokens; `/judge` and `/suggest` call Claude Haiku via the local CLI
  using a warm process pool (see wiki.md).
- `app.js`: mic → 16 kHz PCM AudioWorklet → ElevenLabs Scribe v2 Realtime
  WebSocket (VAD commits, 0.6 s silence) → two racing detectors
  (in-browser MiniLM embeddings on every partial; Claude judge on every
  committed utterance) → first to fire wins → Claude suggests next 3.
- Live speed panel: start talking → first words; stop talking → final
  sentence; instant-check ms; AI-check s; new-questions s. A results
  table per round shows which detector caught it and how long after I
  stopped talking. An "I asked this" button logs detector misses as
  `manual`.

Status: built. Server endpoints verified by curl (token mint; judge 4/4
correct on paraphrase/near-miss cases at ~1.5 s; suggest ~1.7 s). The
live mic + browser flow is not yet verified; I need to try it by voice.

### Phase 2: Try it, tune, write up findings
- Run several 5-round sessions by voice; tune the instant-match threshold
  slider (default 0.72); record real latency numbers and miss/false-hit
  rates in wiki.md.
- Decide what (if anything) graduates into Master's Wheel and how
  (overlay window, which detector, local vs cloud STT).

Status: next.
