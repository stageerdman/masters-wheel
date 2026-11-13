// Call Coach prototype — browser side.
//
// Pipeline:  mic → 16 kHz PCM (AudioWorklet) → ElevenLabs realtime STT (WebSocket)
//            → partial + committed transcript
//            → two detectors racing each other:
//                 "Instant": local sentence embeddings (MiniLM, in-browser), scored
//                            on every partial, fires when similarity ≥ threshold
//                 "AI":      Claude Haiku judges each committed utterance (~2–3 s)
//            → first one to fire marks the question asked → Claude suggests 3 more.
// Five rounds, then it stops and leaves the results table.

import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6";

const ROUNDS = 5;
const SAMPLE_RATE = 16000;
const CHUNK_SAMPLES = 1600; // 100 ms per WebSocket message
const VOICE_RMS = 0.015; // rough "someone is talking" level for latency timing
const ONSET_SILENCE_MS = 500; // silence needed before a new onset counts
const WINDOWS = [6, 10, 16, 24]; // word-window sizes the instant detector scores
const FIRST_QUESTIONS = [
  "What made you start looking for a solution like this now?",
  "How are you handling this today?",
  "What would success look like for you six months from now?",
];

const $ = (id) => document.getElementById(id);
const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
const secs = (ms) => (ms == null ? "—" : `${(ms / 1000).toFixed(2)} s`);

// ---------- state ----------
const state = {
  running: false,
  round: 0,
  questions: [], // [{ id, text, emb, score, peak, status: 'pending'|'asked'|'dropped' }]
  roundOpen: false, // false while waiting for the next questions
  committed: [], // committed transcript segments
  partial: "",
  log: [],
  threshold: 0.72,
  // timing
  lastVoiceAt: 0,
  speaking: false,
  onsetAt: null,
  m: { firstText: [], finalText: [], instant: [], judge: [], suggest: [] },
};
let ws, audioCtx, stream, embedder;

// ---------- UI ----------
function setStatus(text, isError = false) {
  $("status").textContent = text;
  $("status").className = isError ? "error" : "";
}

function renderQuestions() {
  $("round").textContent = state.round ? `· round ${Math.min(state.round, ROUNDS)} of ${ROUNDS}` : "";
  const box = $("questions");
  box.innerHTML = "";
  for (const q of state.questions) {
    const el = document.createElement("div");
    el.className = `q ${q.status}`;
    el.innerHTML = `<div class="text"></div>
      <button class="mark secondary">${q.status === "asked" ? "Asked ✓" : "I asked this"}</button>
      <div class="meter"><i style="width:${Math.max(0, q.score) * 100}%"></i><b style="left:${state.threshold * 100}%"></b></div>
      <div class="score">instant match ${q.score.toFixed(2)} · peak ${q.peak.toFixed(2)}</div>`;
    el.querySelector(".text").textContent = q.text;
    const btn = el.querySelector("button");
    btn.disabled = q.status !== "pending" || !state.roundOpen;
    btn.onclick = () => markAsked(q, "manual", lastWords(24));
    box.appendChild(el);
  }
}

function renderTranscript() {
  const box = $("transcript");
  box.innerHTML = "";
  for (const seg of state.committed.slice(-30)) box.append(seg + " ");
  const p = document.createElement("span");
  p.className = "partial";
  p.textContent = state.partial;
  box.appendChild(p);
  box.scrollTop = box.scrollHeight;
}

function renderMetrics() {
  const m = state.m;
  const items = [
    [median(m.firstText), "Start talking → first words on screen", m.firstText.length],
    [median(m.finalText), "Stop talking → final sentence", m.finalText.length],
    [median(m.instant), "Instant match check", m.instant.length],
    [median(m.judge), "AI check (Claude Haiku)", m.judge.length],
    [median(m.suggest), "New questions (Claude Haiku)", m.suggest.length],
  ];
  $("metrics").innerHTML = items
    .map(([v, l, n]) => `<div class="metric"><div class="v">${l.startsWith("Instant") && v != null ? `${Math.round(v)} ms` : secs(v)}</div><div class="l">${l} · median of ${n}</div></div>`)
    .join("");
}

function renderLog() {
  const body = $("log").querySelector("tbody");
  body.innerHTML = "";
  for (const r of state.log) {
    const tr = document.createElement("tr");
    const after = r.whileSpeaking ? "while still talking" : secs(r.afterStop);
    tr.innerHTML = `<td>${r.round}</td><td></td><td></td><td><span class="tag ${r.method}">${r.method}</span></td><td>${after}</td>`;
    tr.children[1].textContent = r.question;
    tr.children[2].textContent = r.said;
    body.appendChild(tr);
  }
}

// ---------- rounds ----------
async function setQuestions(texts) {
  const embs = await embed(texts);
  state.round += 1;
  state.questions = texts.map((text, i) => ({
    id: `Q${i + 1}`, text, emb: embs[i], score: 0, peak: 0, status: "pending",
  }));
  state.roundOpen = true;
  $("thinking").textContent = "";
  renderQuestions();
}

function markAsked(q, method, said) {
  if (!state.roundOpen || q.status !== "pending") return;
  const now = performance.now();
  state.roundOpen = false;
  q.status = "asked";
  for (const other of state.questions) if (other !== q) other.status = "dropped";
  const sinceVoice = now - state.lastVoiceAt;
  state.log.push({
    round: state.round, question: q.text, said, method,
    afterStop: sinceVoice, whileSpeaking: state.speaking || sinceVoice < 250,
  });
  renderQuestions();
  renderLog();

  if (state.round >= ROUNDS) {
    $("thinking").textContent = `All ${ROUNDS} rounds done.`;
    stop();
    return;
  }
  nextRound();
}

async function nextRound() {
  $("thinking").textContent = "Thinking of the next three questions…";
  try {
    const res = await post("/suggest", {
      transcript: state.committed.join(" ").slice(-3000),
      asked: state.log.map((r) => r.question),
    });
    state.m.suggest.push(res.ms);
    renderMetrics();
    if (state.running) await setQuestions(res.questions);
  } catch (e) {
    $("thinking").textContent = "";
    setStatus(`Couldn't get new questions: ${e.message}`, true);
  }
}

// ---------- detector 1: instant (local embeddings) ----------
async function embed(texts) {
  const out = await embedder(texts, { pooling: "mean", normalize: true });
  return out.tolist();
}

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

function lastWords(n) {
  const words = `${state.committed.slice(-3).join(" ")} ${state.partial}`.trim().split(/\s+/).filter(Boolean);
  return words.slice(-n).join(" ");
}

let scoring = false, rescore = false;
async function scoreInstant() {
  if (!state.roundOpen) return;
  if (scoring) { rescore = true; return; }
  scoring = true;
  try {
    const windows = [...new Set(WINDOWS.map(lastWords))].filter((w) => w.split(" ").length >= 3);
    if (windows.length) {
      const t0 = performance.now();
      const embs = await embed(windows);
      state.m.instant.push(performance.now() - t0);
      if (state.roundOpen) {
        for (const q of state.questions) {
          let best = 0, bestWin = "";
          embs.forEach((e, i) => { const s = dot(q.emb, e); if (s > best) { best = s; bestWin = windows[i]; } });
          q.score = best;
          q.peak = Math.max(q.peak, best);
          q.bestWin = bestWin;
        }
        const top = [...state.questions].sort((a, b) => b.score - a.score)[0];
        if (top && top.score >= state.threshold) markAsked(top, "instant", top.bestWin);
        else renderQuestions();
      }
    }
  } finally {
    scoring = false;
    if (rescore) { rescore = false; scoreInstant(); }
  }
}

// ---------- detector 2: AI judge (Claude) ----------
async function judgeCommitted(text) {
  if (!state.roundOpen || text.split(/\s+/).length < 3) return;
  const round = state.round;
  const pending = state.questions.filter((q) => q.status === "pending");
  try {
    const res = await post("/judge", {
      questions: pending.map((q) => ({ id: q.id, text: q.text })),
      utterance: text,
      context: state.committed.slice(-4, -1).join(" "),
    });
    state.m.judge.push(res.ms);
    renderMetrics();
    if (round !== state.round) return; // a newer round already started
    const hit = pending.find((q) => res.asked.includes(q.id));
    if (hit) markAsked(hit, "ai", text);
  } catch (e) {
    setStatus(`AI check failed: ${e.message}`, true);
  }
}

// ---------- transcription (ElevenLabs realtime) ----------
function onMessage(evt) {
  const msg = JSON.parse(evt.data);
  const now = performance.now();
  switch (msg.message_type) {
    case "session_started":
      setStatus("Listening. Talk naturally — ask one of the questions in your own words.");
      break;
    case "partial_transcript":
      if (msg.text && msg.text !== state.partial) {
        if (state.onsetAt != null) { state.m.firstText.push(now - state.onsetAt); state.onsetAt = null; renderMetrics(); }
        state.partial = msg.text;
        renderTranscript();
        scoreInstant();
      }
      break;
    case "committed_transcript": {
      const text = (msg.text || "").trim();
      state.partial = "";
      if (text) {
        if (!state.speaking) state.m.finalText.push(now - state.lastVoiceAt);
        state.committed.push(text);
        renderMetrics();
        scoreInstant();
        judgeCommitted(text);
      }
      renderTranscript();
      break;
    }
    default:
      if (msg.error || msg.warning) setStatus(`${msg.message_type}: ${msg.error || msg.warning}`, !!msg.error);
  }
}

const WORKLET = `
class Tap extends AudioWorkletProcessor {
  process(inputs) { const ch = inputs[0][0]; if (ch) this.port.postMessage(ch.slice(0)); return true; }
}
registerProcessor("tap", Tap);`;

async function startAudio() {
  stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
  await audioCtx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" })));
  const node = new AudioWorkletNode(audioCtx, "tap");
  audioCtx.createMediaStreamSource(stream).connect(node);

  let buf = new Float32Array(0);
  node.port.onmessage = ({ data }) => {
    const merged = new Float32Array(buf.length + data.length);
    merged.set(buf); merged.set(data, buf.length);
    buf = merged;
    while (buf.length >= CHUNK_SAMPLES) {
      sendChunk(buf.subarray(0, CHUNK_SAMPLES));
      buf = buf.slice(CHUNK_SAMPLES);
    }
  };
}

function sendChunk(f32) {
  // voice-activity bookkeeping, only used for the latency numbers
  const now = performance.now();
  let sum = 0;
  for (const x of f32) sum += x * x;
  const voiced = Math.sqrt(sum / f32.length) > VOICE_RMS;
  if (voiced) {
    if (!state.speaking && now - state.lastVoiceAt > ONSET_SILENCE_MS) state.onsetAt = now;
    state.speaking = true;
    state.lastVoiceAt = now;
  } else if (state.speaking && now - state.lastVoiceAt > 200) {
    state.speaking = false;
  }

  if (ws?.readyState !== WebSocket.OPEN) return;
  const pcm = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) pcm[i] = Math.max(-1, Math.min(1, f32[i])) * 0x7fff;
  const bytes = new Uint8Array(pcm.buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  ws.send(JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: btoa(bin), commit: false, sample_rate: SAMPLE_RATE }));
}

async function openTranscription() {
  const { token } = await post("/token", {});
  const params = new URLSearchParams({
    model_id: "scribe_v2_realtime",
    audio_format: "pcm_16000",
    commit_strategy: "vad",
    vad_silence_threshold_secs: "0.6",
    token,
  });
  ws = new WebSocket(`wss://api.elevenlabs.io/v1/speech-to-text/realtime?${params}`);
  ws.onmessage = onMessage;
  ws.onerror = () => setStatus("Transcription connection error.", true);
  ws.onclose = (e) => { if (state.running) setStatus(`Transcription closed (${e.code}${e.reason ? `: ${e.reason}` : ""}).`, true); };
  await new Promise((resolve, reject) => { ws.onopen = resolve; setTimeout(() => reject(new Error("ElevenLabs didn't connect")), 8000); });
}

// ---------- plumbing ----------
async function post(path, body) {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

async function start() {
  $("start").disabled = true;
  try {
    Object.assign(state, { running: true, round: 0, committed: [], partial: "", log: [], m: { firstText: [], finalText: [], instant: [], judge: [], suggest: [] } });
    renderLog(); renderTranscript(); renderMetrics();
    if (!embedder) {
      setStatus("Loading the instant-match model (first run downloads ~25 MB)…");
      embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    await setQuestions(FIRST_QUESTIONS);
    setStatus("Connecting microphone and transcription…");
    await openTranscription();
    await startAudio();
    $("start").textContent = "Stop";
    $("start").onclick = stop;
  } catch (e) {
    setStatus(e.message, true);
    stop();
  } finally {
    $("start").disabled = false;
  }
}

function stop() {
  state.running = false;
  state.roundOpen = false;
  try { ws?.close(); } catch {}
  stream?.getTracks().forEach((t) => t.stop());
  audioCtx?.close().catch(() => {});
  ws = stream = audioCtx = null;
  $("start").textContent = "Start over";
  $("start").onclick = start;
  if (!$("status").classList.contains("error")) setStatus("Stopped.");
  renderQuestions();
}

$("start").onclick = start;
$("threshold").oninput = (e) => {
  state.threshold = Number(e.target.value);
  $("thresholdValue").textContent = state.threshold.toFixed(2);
  renderQuestions();
};
renderMetrics();
