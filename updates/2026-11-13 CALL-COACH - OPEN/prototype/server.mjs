// Call Coach prototype server — zero dependencies, plain Node.
//
// Three jobs only:
//   POST /token    → mints a single-use ElevenLabs realtime token so the
//                    browser can stream mic audio straight to ElevenLabs
//                    without ever seeing the real API key.
//   POST /judge    → asks Claude (Haiku, via the local `claude` CLI — same
//                    no-API-key pattern as src-tauri/src/claude_cli.rs)
//                    whether a just-finished utterance asked any of the
//                    pending questions, wording-insensitive.
//   POST /suggest  → asks Claude for the next 3 questions.
// Everything else is static files from this folder.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { spawn, exec } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(HERE, "../../../.env");
const PORT = Number(process.env.PORT || 4870);

async function loadApiKey() {
  const env = await readFile(ENV_PATH, "utf8").catch(() => "");
  const line = env.split("\n").find((l) => l.startsWith("ELEVENLABS_API_KEY="));
  return line ? line.slice("ELEVENLABS_API_KEY=".length).trim().replace(/^"|"$/g, "") : "";
}

// Claude via the local CLI, kept warm.
//
// Measured: a cold `claude -p` spends ~4 s just booting before the model
// answers in ~1–2 s. So we keep pre-spawned processes idling on stdin
// (`--input-format stream-json`), one pool per system prompt. A request
// takes a spare, writes ONE message, closes stdin, reads the result — the
// process then exits and a fresh spare is spawned behind it. Every call is
// still a clean single-turn conversation (no history bleeding between
// judgments), but the boot cost is paid ahead of time.
function spawnClaude(systemPrompt) {
  const child = spawn(
    "claude",
    [
      "--model", "haiku",
      "--effort", "low",
      "--input-format", "stream-json",
      "--output-format", "stream-json",
      "--verbose",
      "--tools", "",
      "--permission-mode", "dontAsk",
      "--setting-sources", "",
      "--system-prompt", systemPrompt,
      "-p",
    ],
    { cwd: tmpdir(), stdio: ["pipe", "pipe", "pipe"] },
  );
  let out = "", err = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (err += d));
  child.done = new Promise((resolve) => child.on("close", () => resolve({ out, err })));
  child.on("error", () => {});
  return child;
}

function makePool(systemPrompt, size) {
  const spares = Array.from({ length: size }, () => spawnClaude(systemPrompt));
  return async function ask(message) {
    const child = spares.shift() || spawnClaude(systemPrompt);
    spares.push(spawnClaude(systemPrompt));
    const timer = setTimeout(() => child.kill(), 30000);
    child.stdin.end(JSON.stringify({ type: "user", message: { role: "user", content: message } }) + "\n");
    const { out, err } = await child.done;
    clearTimeout(timer);
    const result = out.split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .find((e) => e?.type === "result");
    if (!result) throw new Error(err.trim() || "Claude didn't return a reply");
    if (result.is_error) throw new Error(result.result || "Claude returned an error");
    return String(result.result || "");
  };
}

const JUDGE_PROMPT = `You judge, in real time, whether a salesperson just asked any of a list of target questions on a live call.
A question counts as ASKED if the salesperson asked something with the same meaning and intent, even with different wording, word order, or as part of a longer sentence. It does NOT count if they only mentioned the topic, made a statement, or asked about something clearly different.
The transcript comes from live speech-to-text and may lack punctuation or contain small recognition errors.
Reply with exactly one line and nothing else:
ASKED: <comma-separated ids of asked questions, or NONE>`;

const SUGGEST_PROMPT = `You are a world-class sales coach whispering to a salesperson during a live discovery call.
You only hear the salesperson's side of the call (their microphone).
Propose the 3 best questions for them to ask next: open-ended, natural to say out loud, each under 15 words, each exploring a different angle, building on what has been discussed and never repeating a question already asked.
Reply with exactly three lines and nothing else:
Q: <question>
Q: <question>
Q: <question>`;

const askJudge = makePool(JUDGE_PROMPT, 2);
const askSuggest = makePool(SUGGEST_PROMPT, 1);

async function judge({ questions, utterance, context }) {
  const list = questions.map((q) => `${q.id}: ${q.text}`).join("\n");
  const message = `Target questions:\n${list}\n\nEarlier in the call (context only):\n${context || "(nothing yet)"}\n\nWhat the salesperson just said:\n${utterance}`;
  const reply = await askJudge(message);
  const line = reply.split("\n").find((l) => l.toUpperCase().startsWith("ASKED:")) || "ASKED: NONE";
  const ids = line.slice(6).split(",").map((s) => s.trim()).filter((s) => s && s.toUpperCase() !== "NONE");
  const valid = new Set(questions.map((q) => q.id));
  return { asked: ids.filter((id) => valid.has(id)), raw: reply.trim() };
}

async function suggest({ transcript, asked }) {
  const message = `Questions already asked:\n${asked.map((q) => `- ${q}`).join("\n") || "(none)"}\n\nWhat the salesperson has said so far:\n${transcript || "(nothing yet)"}`;
  const reply = await askSuggest(message);
  const questions = reply
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^Q:/i.test(l))
    .map((l) => l.slice(2).trim())
    .slice(0, 3);
  if (questions.length < 3) throw new Error(`Unexpected reply: ${reply}`);
  return { questions };
}

async function mintToken() {
  const key = await loadApiKey();
  if (!key) throw new Error("ELEVENLABS_API_KEY is missing from the project's .env");
  const res = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
    method: "POST",
    headers: { "xi-api-key": key },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.token) throw new Error(`ElevenLabs token request failed (${res.status}): ${JSON.stringify(body)}`);
  return { token: body.token };
}

const ROUTES = { "/token": mintToken, "/judge": judge, "/suggest": suggest };
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

function readJson(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); }
    });
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "POST" && ROUTES[url.pathname]) {
    const started = Date.now();
    try {
      const result = await ROUTES[url.pathname](await readJson(req));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ...result, ms: Date.now() - started }));
    } catch (e) {
      console.error(url.pathname, e.message);
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  if (!TYPES[extname(file)] || file.includes("..")) {
    res.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(join(HERE, file));
    res.writeHead(200, { "content-type": TYPES[extname(file)] });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Call Coach running at ${url}  (Ctrl+C to stop)`);
  if (!process.env.NO_OPEN) exec(`open ${url}`);
});
