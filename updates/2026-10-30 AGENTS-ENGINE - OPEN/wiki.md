# Wiki — Agents engine (real AI behind Agents + AI Assistant)

Research-only pass (no code written yet). Goal: figure out how to power the
already-built UI shells — `Agents` (the "build your own GPT": name,
instructions, knowledgeFiles, versions) and `AIAssistant` (chat with
@mention/drag multiple agents into one session) — with a real Claude/
Anthropic backend: custom instructions, knowledge/RAG, tool calling
(e.g. Notion), and multiple agents replying in one thread.

Synthesized from 3 parallel research passes (Claude/Anthropic engine
options, RAG/knowledge-tier architecture, multi-agent single-thread
orchestration) plus direct inspection of this repo's current runtime shape.

## The decision that gates everything else: where does "the engine" run?

This is the single biggest finding, and none of the generic AI-stack
research below matters until it's resolved — it changes which tools are
even usable.

**This app has no server at runtime.** `next.config.ts` sets
`output: "export"` — a fully static build (see
`updates/2026-10-29 NATIVE-APP - OPEN/wiki.md`). The packaged product is a
Tauri `.app`, not a hosted Next.js site. There is no `app/api/*` route
layer, no Node process, nothing that can hold a server-side secret the way
a Next.js API route normally would. "Deployed to Vercel later" (CLAUDE.md)
was explicitly superseded by this pivot — Vercel hosting isn't ruled out
forever, just not the current direction.

**This codebase already has a precedent for exactly this problem.**
`src-tauri/src/transcribe.rs` calls an external AI API (ElevenLabs
Speech-to-Text) that needs a secret key, from Rust:
- `ANTHROPIC_API_KEY`-shaped secrets load via `load_dotenv()` in `lib.rs`
  (reads the project's `.env` at compile-resolved path, sets process env,
  existing env always wins).
- The actual HTTP call shells out to `curl` (not a Rust HTTP crate — no
  `reqwest`/`hyper` in `Cargo.toml` today, only `tiny_http` for an inbound
  media server) — same lightweight-integration reasoning as using `ffmpeg`/
  `ffprobe` via `Command` instead of a Rust audio crate.
- Long-running/streamable work runs as a tracked background job: a job id
  returns immediately, progress streams out via Tauri `Emitter` events
  (`generate-transcript-progress`), and a `cancel_*` command kills the
  in-flight child process. This is the right shape for a chat reply too
  (streamed tokens, cancellable mid-generation).
- The frontend only ever calls Tauri `invoke()` commands — it never talks
  to ElevenLabs directly, and never sees the key.

**What this means for "which SDK do I use":** the two most obvious
Claude-powered "build an agent" toolkits — the **Claude Agent SDK** and the
**Vercel AI SDK**'s `ToolLoopAgent`/MCP client — are both Node.js/Python
libraries. Neither can run inside the Rust process. If the engine lives in
Rust (matching this app's actual architecture and existing precedent),
those SDKs are reference material for *shape* (system prompt + tool loop +
multi-step reasoning), not libraries you import. The actual backend would
be: Rust loads `ANTHROPIC_API_KEY`, calls Anthropic's raw Messages API
directly (`curl`, or a newly-added `reqwest` if streaming-via-curl proves
awkward — see "open decisions"), parses `tool_use`/`mcp_tool_use` blocks
itself, and emits streamed deltas back to the frontend as Tauri events —
the Messages API is plain JSON over HTTPS, so this is tractable to hand-roll.

**The alternative** is to not build this in Rust at all: stand up a small
hosted endpoint (e.g. a single Vercel-deployed API route) that the Tauri
frontend calls over the network, and use the Vercel AI SDK/Claude Agent SDK
there in full. This buys back every library feature (typed tool defs,
`useChat` streaming helpers, MCP client, built-in agent loop) at the cost
of: reintroducing a server this app deliberately moved away from, a second
deploy pipeline/target, network-dependency for a feature in an otherwise
offline-capable local app, and a real question of whose API key pays for
usage once it's not "my own key in my own `.env`" (a hosted endpoint
implies either passing the user's own key through, or you now meter/secure
a shared backend key across however many installs of the app exist — a
different product shape than "one user's local app").

**Not deciding this in this research pass** — flagged to the user as the
one genuinely product-level fork. See "Open decisions" below.

## Claude/Anthropic engine options (works regardless of which side of the
fork above you land on, since these are all plain HTTPS/JSON)

- **Claude Agent SDK** — packages the full Claude Code harness
  (tools, agent loop, sessions, permissions, hooks, subagents, MCP support)
  for use on your own infrastructure. Explicitly built for coding
  automation/dev tasks, not turnkey chat products — you'd still write your
  own chat UI and conversation model around it. Requires a Node/Python
  process to host it; not usable from Rust directly. Supports running
  multiple distinct agent configs (system prompt + tools each) in one
  process via subagents, which maps conceptually onto "multiple Agents in
  one AIAssistant session" if this ever runs on a Node backend.
  (code.claude.com/docs/en/agent-sdk/overview)

- **Raw Messages API `tool_use`** — the model-agnostic-to-SDK primitive:
  you send a tool schema, Claude replies with a `tool_use` block when it
  wants to call it, you execute and send back `tool_result`. This is what
  every SDK above is automating a loop around — small enough to hand-roll
  in Rust for one or two tool types.

- **MCP Connector (beta)** — the standout finding for a Rust/curl backend
  specifically: pass `mcp_servers` (remote server configs) and
  `mcp_toolset` directly in the Messages API request JSON, and Anthropic's
  own infrastructure calls the remote MCP server (e.g. a Notion MCP
  server) server-side — no MCP client library needed at all. This is how
  "give an agent the ability to read Notion pages" becomes achievable from
  Rust without ever implementing the MCP protocol yourself: it's just
  another field in the JSON body. Requires beta header
  (`mcp-client-2026-09-15` or similar — verify current value before
  building) and the remote server's own auth (e.g. Notion OAuth token)
  supplied per-request. (platform.claude.com/docs/en/agents-and-tools/mcp-connector)

- **Files API (beta) + citations** — upload a knowledge file once, get a
  `file_id` back, reference it in future requests instead of re-sending
  the text; enable `citations: {enabled: true}` on a document to get
  grounded, cited answers. 500MB/file, 100GB org-wide, PDF + plain text
  confirmed supported (unclear whether raw `.xlsx` is accepted directly or
  needs conversion to text/CSV first — unverified, check before relying on
  it for the spreadsheet knowledge files already in this app's fixtures).
  Files can't be edited after upload — replacing a knowledge file means
  uploading a new file and swapping the stored `file_id`, not patching the
  old one.

- **Prompt caching** — cache the static prefix (an agent's instructions +
  its knowledge text) so repeat turns, and repeat agents sharing the same
  conversation, pay ~10% input price on cache reads instead of full price.
  This is what makes "N agents dropped into one chat, each with their own
  instructions" cheap in practice — the expensive part isn't agent count,
  it's how often each one actually gets invoked (see multi-agent section).

- **Model/cost**: start with the current Sonnet tier for the chat
  feature — strong instruction-following and tool use at a fraction of
  Opus's cost, more than enough headroom for a low-traffic prototype.
  Haiku tier is the fallback if cost/latency ever actually matters at this
  app's scale (unlikely for a single local user). Prompt caching is what
  keeps a multi-agent conversation cheap, not model choice.

## Knowledge/RAG: which tier fits this app, mapped onto `knowledgeFiles`

Three tiers, cheapest-to-build first:

1. **Tier 0 — full-context stuffing + prompt caching.** Extract each
   knowledge file's text (once; cache the extraction, not just the model
   call) and concatenate it into the agent's system prompt alongside
   `instructions`, cached via `cache_control`. For "a handful of agents,
   each with a handful of small/medium PDFs and a spreadsheet," this fits
   comfortably inside Claude's current context window with no retrieval
   code at all — and it's the only tier that makes the fixture data's
   inline `@Objection Playbook.pdf` references in `instructions` *exact*,
   since nothing is filtered out before the model sees it.
2. **Tier 1 — keyword/full-text search over chunks**, no embeddings. Only
   worth adding once a single agent's knowledge genuinely exceeds a
   comfortable context budget (rough ballpark: hundreds of thousands of
   tokens) — not needed at this app's current fixture scale.
3. **Tier 2 — real RAG** (chunk → embed via Voyage AI, Anthropic's
   recommended embeddings partner → vector search). Only justified once an
   agent's corpus is both too large for Tier 0 *and* lexical matching
   (Tier 1) isn't precise enough. If/when this is needed, the "smallest
   infra that fits this project" option is in-process (`sqlite-vec` or a
   flat on-disk vector array), matching this repo's existing
   `LOCAL-RECORDS-BACKEND` precedent of on-disk JSON over a hosted DB —
   not Upstash Vector or Neon/pgvector, which are the right call only once
   this app actually gets a hosted multi-instance backend.

**Recommendation: start at Tier 0.** It's a day or two of work, matches the
fixture data's own assumptions, and nothing about this app's current scale
(a handful of agents, a handful of files each) justifies building
retrieval infrastructure yet. Two implementation choices *within* Tier 0,
not yet decided:
- Extract text yourself (PDF via `pdftotext`/Poppler shelled out the same
  way `ffmpeg`/`ffprobe` already are, or a Rust crate like `calamine` for
  `.xlsx`) and stuff raw text into the system prompt you build — full
  control, no beta API dependency.
- Or upload files via Anthropic's Files API and lean on server-side
  citations — less extraction code, but beta, and unclear `.xlsx` support
  (see above).

**Re-ingestion / versioning**: knowledge *content* should always reflect
the current file set, not be versioned alongside an agent's instruction
history — an old version of a knowledge file going stale and silently
still answering from it is a correctness bug, not a feature. If a future
need arises to answer "what did this agent know as of version N," version
which file IDs were attached at that version (cheap, close to what the
existing version-history mechanism already tracks), not full
extracted/chunked content per version.

## Multi-agent, one thread: mapped onto `activeAgentIds` / `@mention`

The existing frontend data model (`findMentionedAgents`,
`activeAgentIds` on a `ChatSession`) already encodes the hard part of this
problem — which agent(s) a given message is addressed to — so the backend
doesn't need a router/moderator model at all for v1. Every surveyed
framework (AutoGen GroupChat, CrewAI, OpenAI Agents SDK handoffs, Vercel's
own orchestrator-worker/handoff patterns, Anthropic's Managed-Agents
coordinator) builds a speaker-selection mechanism *because they have no
mention UI* — this app already solved that at the UI layer before any of
this research started.

**Recommended v1 shape:**
- A message that @mentions N agents → N separate Messages API calls, one
  per agent (each with that agent's own system prompt), run in parallel
  against the same shared transcript.
- Every agent sees the **full transcript**, speaker-labeled (human and
  other agents alike) — not a filtered/isolated view. This is what lets an
  agent avoid repeating what another agent already said, or build on it.
  Cost is bounded by how many agents are actually mentioned per message,
  not by roster size; prompt caching means each agent's own
  instructions+knowledge prefix is cheap on repeat invocations, and the
  shared transcript suffix is cheap too once cached.
- Display order: either mention order (deterministic) or response-arrival
  order (more natural if streaming both replies live) — either is fine
  for v1.
- **Don't build a moderator/selector** (an LLM call deciding who should
  respond, independent of mentions) speculatively — that solves a problem
  this UI doesn't have. Revisit only if a later feature wants agents to
  respond unprompted (e.g. an ambient "jumps in when it sees X" agent),
  which is a deliberate, separately-scoped v2.
- Reach for a heavier orchestrator only if/when: 3+ agents are regularly
  mentioned together and need to take turns rather than all answering in
  parallel, agents need to react to each other *within* the same turn
  (requires serializing calls, feeding each agent the previous agent's
  just-generated reply), or truly unaddressed/ambient agents get dictated
  as a feature.

## Tool calling (the Notion example)

Two distinct cases, both plain HTTPS from whichever side of the engine
fork this ends up on:
- **A remote capability someone else hosts as an MCP server** (Notion,
  Slack, GitHub, etc.) → Anthropic's MCP Connector beta, described above.
  No client library, no protocol implementation — just additional JSON on
  the Messages API request.
- **A capability unique to this app** (e.g. "look at this agent's attached
  knowledge files," "search this app's local records") → an ordinary
  custom `tool_use` definition, executed locally wherever the engine runs
  (Rust command or Node handler), with the result sent back as a
  `tool_result` in a follow-up request. This is the same small hand-rolled
  loop mentioned under "Claude/Anthropic engine options."

## Decision made: the engine is the user's local Claude Code CLI, not the Anthropic API

Asked the user directly (the one decision this research couldn't resolve
on its own): explicitly **not** the Anthropic Messages API with a
pay-per-token key. The engine is the user's own already-authenticated
local `claude` CLI, invoked headlessly in the background — same spirit as
`transcribe.rs` shelling out to `curl`/`ffmpeg`, except the external
binary is `claude` itself rather than a pure HTTP call. This sidesteps the
entire API-key-in-a-Tauri-app question from the "Open decisions" section
below (now resolved) and the whole Claude-Agent-SDK-vs-raw-Messages-API
discussion above (moot — neither applies; the CLI itself *is* the agent
harness).

### Verified headless-invocation mechanics (checked by hand on this machine, not just docs)

- **Binary**: `/opt/homebrew/bin/claude` (symlink into the npm global
  install) — resolved the same way `ffmpeg`/`ffprobe` already are
  (`resolve_binary`, now shared in `src-tauri/src/util.rs` since this is
  its second real use). A GUI-launched `.app` doesn't inherit shell PATH,
  so the bare name alone would fail exactly like it would for ffmpeg.
- **Single reply**: `claude -p "<message>" --output-format json
  --append-system-prompt "<persona instructions>" --permission-mode
  dontAsk`. Returns one JSON object; `result` is the reply text,
  `session_id` is what to pass back next turn.
- **`--bare` breaks auth in this environment.** The docs describe `--bare`
  as the way to skip a project's own CLAUDE.md/hooks/plugins/MCP/memory —
  looked like the obvious fix for "don't let the agent answer as if it
  knows this repo's own coding conventions." Tested by hand: with
  `--bare`, the exact same call returns `"Not logged in · Please run
  /login"` even though a plain `claude -p` works fine seconds later
  without it. **Don't use `--bare` here** — confirmed broken, not just
  theoretically risky.
- **The actual fix: run the subprocess with its working directory set to
  `std::env::temp_dir()`** instead. Claude Code discovers CLAUDE.md by
  walking up from cwd — a neutral temp directory never reaches this
  repo's CLAUDE.md, so the project's own instructions don't leak into an
  agent's persona, while auth and everything else keep working normally.
  Verified directly: asked a `cwd`-isolated invocation "do you have any
  special instructions about masters-wheel/CLAUDE.md/AI Control
  modules/construction outlines?" — answered no, confirming isolation
  without needing `--bare` at all.
- **Session continuity works as documented.** Verified a 2-turn exchange
  by hand: first call with no `--resume` returns a fresh `session_id`;
  passing that id via `--resume` on the next call correctly recalled
  something stated only in turn 1, with the same `--append-system-prompt`
  persona still in effect. This is what Phase 1 uses: each `ChatSession`
  stores a `claudeSessionId`, passed back on every later turn in that
  session.
- **Persona instructions via `--append-system-prompt` work as expected** —
  verified a "keep replies to one short sentence" persona actually
  produced one-sentence replies, not the default Claude Code voice.
- **Latency is real but acceptable for chat, not for anything snappier**:
  the research agent's estimate (~1.5–2s cold, ~0.6–1.2s on resume) matches
  what was observed by hand (~2.3s for a cold single-turn call, including
  CLI startup). Fine for a chat reply a user is waiting a moment for;
  would feel bad for anything wanting sub-second response.
- **Tool/MCP access deliberately not wired in Phase 1** — no
  `--allowedTools` passed means `--permission-mode dontAsk` denies every
  tool, so a Phase-1 reply is pure text generation, nothing else. Knowledge
  file access (`--add-dir`) and MCP servers (`--mcp-config`) are the next
  increment, not yet built.

## Open decisions (remaining after the engine choice above)

1. ~~Where the engine runs~~ — **resolved**: Rust/Tauri command shelling
   out to the local `claude` CLI headlessly. No Anthropic API, no HTTP
   client crate needed at all (not `curl`, not `reqwest`) — the CLI is the
   entire client.
2. Whether knowledge files get wired via `--add-dir` (let Claude's own
   Read/Grep/Glob tools read them directly — verified viable by the CLI
   research, not yet hand-tested) or manual extraction — still open,
   deferred past the Phase 1 prototype (see `update v1.md`).
3. Whether `.xlsx` knowledge files need conversion before a headless
   invocation can read them via `--add-dir` + Read — unverified either way.
4. Whether the Agent builder (`/agents`) and the AI Assistant's chat roster
   (`AIAssistant.script.ts`'s separate `Agent` type) get unified now that
   there's a real backend to wire, or stay deliberately separate per the
   existing `2026-10-29 AGENTS - CLOSED` wiki decision ("revisit a merge
   only if a future update explicitly asks"). Phase 1's prototype added
   `instructions` directly to the AI Assistant's own lightweight `Agent`
   type rather than merging with `CoachAgent` — smallest change that gets
   a real persona into a real reply without resolving the merge question.
5. Tool/MCP calling (the Notion example) is still unimplemented — Phase 1
   passes no `--allowedTools` at all, so a reply is pure text generation.
   `--mcp-config`/`--allowedTools` are verified-viable flags, not yet
   wired into `assistant.rs`.

## Phase 1.5 research: making a 50+ page knowledge/character document actually *stick*

Second research pass, prompted by a more specific ask: not just "let the
agent see its knowledge files" (Tier 0 above), but "the agent must reliably
act as the character the document describes, and follow both its
instructions and its knowledge content no matter what the user asks" —
i.e. persona *fidelity*, not just knowledge *availability*. Findings below
are from Anthropic's own docs, published research (dated), and direct
inspection of what `assistant.rs` already does.

### Instruction-following over long/complex prompts — what's actually measured

- **Document placement is the single best-evidenced lever.** Anthropic's
  own prompting guide states plainly: for 20k+ token inputs, put long
  documents *above* the query/instructions, not below — "queries at the
  end can improve response quality by up to 30 percent in tests,
  especially with complex, multidocument inputs."
  (platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices,
  current docs, checked 2026-10-30)
- **"Lost in the middle" is real and specifically hits instructions,**
  not just facts: accuracy drops sharply for anything placed in the
  middle of a long context, because instruction-tuned models are heavily
  conditioned to treat the start and end of the input as authoritative.
  One measurement found identical instructions placed at different
  structural positions swung compliance from 26% to 65% depending purely
  on placement. (arxiv.org/pdf/2510.10276, 2026; summarized via Atlan/
  getmaxim.ai explainers, 2025) **Mitigation with actual evidence behind
  it: put a critical instruction at the very start of the prompt *and*
  repeat it at the very end** — not once in the middle of a wall of text.
- **"Context Rot" (Chroma, July 2025):** tested 18 frontier models
  including Claude 4 — every one degrades as input length grows, and the
  degradation starts well before the context window is actually full (a
  200K-token model can visibly degrade by 50K tokens). This is the
  concrete argument against just concatenating all 50 pages into one
  giant `--append-system-prompt` string and hoping scale doesn't matter —
  it does, even for a model that technically "fits" the whole document.
  (trychroma.com/research/context-rot, 2025-07-14)
- **Generic persona framing ("you are a senior X with 20 years of
  experience") measurably does *not* improve task quality** — a cited
  test across 162 personas / ~2,500 prompts found no measurable lift over
  direct instructions, because the model doesn't treat role-flavor text
  as an actionable constraint. Anthropic's own recommended replacement is
  concrete: say where the relevant context lives, define what "done"
  looks like, and ask for a self-check before finishing.
  (mindstudio.ai/blog/claude-code-prompting-mistakes-personas, citing
  Anthropic guidance; 2026) **This is evidence against persona-as-vibe,
  not against this project's use case** — this project doesn't want
  "sound like an expert," it wants "answer only using these specific
  facts, in this specific voice, from this specific document," which is a
  content/grounding constraint, not a flavor adjective, so the finding
  doesn't contradict the goal — it's a reason to lean on the document's
  actual content and explicit rules rather than a one-line role
  description.
- **XML-tag structuring still measurably helps** once a prompt mixes
  several *kinds* of content (persona identity, behavioral rules,
  reference knowledge, the live conversation) — wrap each kind in its own
  tag (`<identity>`, `<rules>`, `<knowledge>`) so the model doesn't have
  to guess where one kind ends and another begins. Same source as above.

### Persona/character-fidelity research specifically

- **RoleLLM / RoleBench** (arxiv 2310.00746) — the main benchmark/dataset
  for *eliciting and scoring* character role-play, measuring speaking-style
  imitation, factual role-knowledge retention, and response accuracy
  separately. Useful as a mental checklist (voice vs. facts vs.
  correctness are three different failure modes, not one) even without
  adopting the benchmark itself.
- **"Enhancing Persona Consistency for LLMs' Role-Playing" (ACL
  Findings 2025)** — the mechanism that measurably improved consistency
  was a *self-questioning pass*: before answering, the model generates and
  checks against a short chain of persona-relevant questions ("would this
  character actually say this?") rather than relying on the system prompt
  alone. This is a training-time method in the paper, but the *idea*
  (cheap self-check step before finalizing a reply) ports directly to a
  prompting-only setup — it's the same shape as Anthropic's own
  "self-check before completion" advice above, just aimed at character
  fidelity instead of task completion.
- **RoleMRC (arxiv 2502.11387)** — benchmarks role-play *and*
  instruction-following together, finding models that nail the voice
  often still miss fine-grained behavioral rules buried in a long
  persona spec. Reinforces: voice consistency and rule-following are
  separate things to verify, passing one doesn't mean the other passed.
- **No training-time fix is usable here anyway** — this project has no
  model weights to touch, only prompts/flags to the CLI, so the
  actionable takeaway from all of the above is purely about *prompt
  structure and the self-check pattern*, not fine-tuning.

### CLI-specific mechanics (verified against this repo's actual code, not just docs)

- **`assistant.rs` already re-sends the full persona instructions on
  *every* turn**, not just the first — `ask_agent`'s `--append-system-prompt`
  argument is built from `instructions` on every call regardless of
  whether `--resume` is also passed. This already matches the "repeat
  the critical instruction, don't rely on it surviving once in history"
  mitigation above, with zero changes needed — a real, confirmed-in-code
  finding, not speculation.
- **`--append-system-prompt` only appends; it doesn't replace** Claude
  Code's own base system prompt, and per Claude Code's own docs it's
  added at the very end of the assembled prompt. Appending a full 50-page
  document this way means that document physically sits *after*
  everything else in the system prompt, every single turn — the opposite
  of Anthropic's own "put long documents first, instructions/query last"
  guidance above. For a short persona paragraph this doesn't matter; for
  a 50-page knowledge dump it's working against the single best-evidenced
  mitigation this research turned up.
- **A better mechanism already exists in this exact codebase's own
  isolation trick, generalized**: `assistant.rs` already runs the
  subprocess with `current_dir` set away from this repo specifically so
  Claude Code's own cwd-walk-up CLAUDE.md discovery *doesn't* pick up
  masters-wheel's conventions. The same mechanism run in reverse is the
  fix for knowledge grounding: give **each agent its own per-agent
  directory** (e.g. an app-data path like
  `~/Library/Application Support/Master's Wheel/agents/<agentId>/`)
  containing that agent's own `CLAUDE.md` (short — core identity, voice,
  non-negotiable rules, repeated once near the top and once at the
  bottom, per the placement research above) plus its real knowledge files
  alongside it. Running the subprocess with `current_dir` set to *that*
  directory instead of a neutral temp dir means Claude Code's own
  CLAUDE.md discovery picks up the persona automatically — no
  `--append-system-prompt` wall-of-text needed at all — and the model's
  own Read/Grep/Glob tools can open the knowledge files on demand,
  instead of a human-designed retrieval step deciding what's relevant.
  This is "Tier 0 done properly": the full knowledge is genuinely
  available (nothing pre-filtered out), but it's *lazily* read via the
  model's own agentic loop rather than force-fed into every turn's token
  budget regardless of relevance — directly answering open decision #2
  below in favor of the `--add-dir`-shaped approach, generalized to
  "becomes cwd" rather than merely an additional allowed directory.
  **Caveat, not yet hand-verified**: this requires actually granting
  `Read`/`Grep`/`Glob` via `--allowedTools` (Phase 1 currently grants
  *no* tools at all via `--permission-mode dontAsk` with nothing
  allow-listed) — needs the same kind of hand-verification this update's
  Phase 1 research already did for `--resume`/`--bare` before relying on
  it.
- **This also surfaces a real gap, not a prompting question**: `Agents`'
  `KnowledgeFile` type (`Agents.data.ts`) is still pure fixture metadata
  (`id`/`name`/`size`/`type`) — there is no code path today that writes
  an uploaded file's actual bytes to disk anywhere. The per-agent-directory
  design above needs that storage layer to exist before `--add-dir`/cwd
  tricks have anything real to point at; it's a prerequisite, not an
  alternative to this research.

### Open-source / prior-art survey (persona agents + RAG), for context

Surveyed as requested, even though this project's own constraints (Tauri
app, no server, the engine is a CLI subprocess) rule most of these out as
things to actually adopt:

- **`awesome-llm-role-playing-with-persona`** (github.com/neph0s) — curated
  reading list of persona/role-play research; good index, not software to
  run.
- **SimsChat** (github.com/Bernard-Yang/SimsChat, paper arxiv 2406.17962) —
  research code for a persona-driven role-play agent framework; academic
  reference implementation, not a maintained product.
- **"open-character-ai"-style projects** — several open-source
  Character.AI clones exist on GitHub (chat with preset or custom
  personas); relevant as prior art for UI/persona-switching patterns, not
  for this app's architecture, since they're all full client-server
  products with their own hosted inference, which is exactly what this
  app deliberately isn't.
- **LlamaIndex / LangChain / Haystack** — the standard general-purpose RAG
  frameworks; explicitly **not** a good fit here even if Tier 2 is ever
  built, because they're Python/Node libraries and this app has no
  Node/Python process to host them in (same constraint that already ruled
  out the Claude Agent SDK and Vercel AI SDK in the first research pass).
  Worth knowing about only as naming/reference for *what a chunk+embed+
  retrieve pipeline looks like*, not as a dependency.
- **GraphRAG** (Microsoft) — entity/relationship-graph-based retrieval for
  very large, interconnected corpora; solves a problem this app doesn't
  have (a handful of files per agent, not a sprawling interlinked corpus)
  — explicitly the wrong tier for this project's scale.
- **For a future in-process Tier 1/2, if an agent's corpus ever actually
  outgrows Tier 0** (not scheduled — see original Tier escalation
  criteria above), the Rust-embeddable options worth knowing about:
  - **tantivy** (crates.io/crates/tantivy) — BM25 full-text search,
    embedded as a library (same shape as Lucene but in-process, no
    separate search server) — the natural Tier 1 choice if keyword search
    is ever needed.
  - **sqlite-vec** — vector KNN search as a SQLite extension; combines
    with SQLite's FTS5 for hybrid keyword+vector search in one file-backed
    DB, matching this project's existing on-disk-JSON-not-a-hosted-DB
    precedent.
  - **fastembed-rs** (github.com/Anush008/fastembed-rs) — generates
    embeddings locally in Rust, no cloud call — the piece that would be
    needed to produce vectors for sqlite-vec without reintroducing a
    network dependency.
  - All three are actively maintained as of this research pass; none are
    needed yet.

### Recommendations for Phase 1.5, ranked by evidence strength

1. **Strong evidence, do this**: move from "one `--append-system-prompt`
   blob containing everything" to **per-agent directory as cwd**
   (CLAUDE.md for identity/rules + real knowledge files alongside),
   letting Claude Code's own file tools read knowledge on demand. Keep
   `--append-system-prompt` for the short behavioral persona only, not the
   knowledge dump.
2. **Strong evidence, do this**: inside that per-agent `CLAUDE.md`, put
   the single most important rule (e.g. "only answer from the attached
   knowledge; stay in character as X no matter what the user asks") both
   near the top *and* repeated verbatim at the very bottom — don't bury a
   one-time statement of it in the middle of a long document.
3. **Strong evidence, do this**: if any knowledge content must still be
   inlined (e.g. a short fact sheet too small to bother with file
   access), place it *before* the behavioral instructions/query, never
   after — matches both Anthropic's documented guidance and avoids how
   `--append-system-prompt` already places appended text at the very end
   by default.
4. **Moderate evidence, worth trying**: a lightweight self-check instruction
   ("before answering, check: does this stay in character, and is
   everything stated actually supported by the attached knowledge files?")
   — directly modeled on the self-questioning techniques in the ACL 2025
   persona-consistency paper and Anthropic's own "self-check before
   completion" guidance, but unverified in this specific CLI setup; cheap
   to test by hand the same way `--resume`/`--bare` were verified in
   Phase 1.
5. **Explicitly not warranted by the evidence**: generic "you are an
   expert in X" persona framing as a substitute for concrete rules — the
   162-persona study found no measurable benefit from flavor text alone.
   Character identity in this project should be expressed as *rules and
   facts* (what the character knows, what it will/won't say, how it
   talks), not as a role-title adjective.
6. **Not evidenced either way, genuinely open**: whether an agent should
   be explicitly told it has knowledge files available and to check them
   before answering (increasing the odds it actually reads them via
   Read/Grep rather than guessing), versus trusting Claude Code's own
   agentic judgment to notice files present in its cwd unprompted — needs
   hand-testing once Phase 1.5 is actually built, same as everything else
   in this update marked "unverified."
