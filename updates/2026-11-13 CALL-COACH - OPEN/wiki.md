# Call Coach — wiki

## Decisions

- **Transcription: ElevenLabs Scribe v2 Realtime over WebSocket.** The
  project already pays for and uses ElevenLabs (`transcribe.rs`), and the
  key is in `.env`. The browser connects directly with a single-use token
  (`POST /v1/single-use-token/realtime_scribe`, `xi-api-key` header,
  server-side), so the real key never reaches the page. WS URL:
  `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&audio_format=pcm_16000&commit_strategy=vad&vad_silence_threshold_secs=0.6&token=…`.
  Client sends `{message_type:"input_audio_chunk", audio_base_64, commit, sample_rate}`;
  server sends `session_started`, `partial_transcript`, `committed_transcript`
  (+ many error types, each with an `error` field).
  Not chosen: Chrome's Web Speech API (wouldn't work inside the Tauri
  WKWebView later); Apple on-device SFSpeechRecognizer (worth a later
  comparison if latency/privacy matter).
- **Two detectors racing, first one wins.**
  - *Instant*: `Xenova/all-MiniLM-L6-v2` via transformers.js 3.7.6 in the
    browser. It scores the last 6/10/16/24 words against each question on
    every partial (cosine similarity, threshold slider). Milliseconds, but
    English-only and weaker on loose paraphrases.
  - *AI*: Claude Haiku judges each committed utterance ("same meaning and
    intent, not just the same topic"). Handles paraphrase well, ~1.5 s
    after the sentence is committed.
- **Claude via the local CLI, kept warm.** Same no-API-key pattern as
  `claude_cli.rs`. Measured on 2026-11-13: a cold `claude -p` takes ~5–6 s
  wall-clock, of which ~4 s is CLI boot and only 1–2 s is the model.
  Fix: pre-spawn idle `claude -p --input-format stream-json` processes per
  system prompt. Each request takes one, writes a single message, closes
  stdin, and a fresh spare spawns behind it. That gives a clean single-turn
  call every time (no history bleed) at ~1.5 s. Also `--effort low`,
  because Haiku was spending 100–300 thinking tokens on a one-line verdict.
  `--setting-sources ""` skips user plugins/settings.

## Lessons

- Reusing one long-lived stream-json process for many turns is fast too
  (~1–1.8 s/turn), but the conversation accumulates, and the judge starts
  reasoning about earlier messages. One process per call from a warm pool
  avoids that.
- The latency numbers in the UI are approximations: "start talking" and
  "stop talking" come from a simple mic-loudness gate (RMS > 0.015), not
  from ElevenLabs word timestamps. "Stop talking → final sentence" includes
  the 0.6 s VAD silence window by design.
