# CLAUDE.md — masters-wheel

Compiled from the global AI Control modules (STRUCTURE, CODING, WORKFLOW, UX)
and tuned for this project. Regenerate with the `rebuild-claude-md` routine
when the global modules change. Local additions below the modules are
preserved across rebuilds.

masters-wheel is "Master's Wheel": a native macOS desktop app (Tauri-packaged
Next.js/TypeScript/CSS-Modules frontend + a Rust backend in `src-tauri/`) for
reviewing recorded sales/coaching calls — real video upload, real
transcription, a real local-LLM-backed AI Assistant and Agents with MCP tool
access, a Scorecard, and multi-Space workspace isolation. No longer
"UI shell only" — real backend logic now lives in `src-tauri/`, all
local-first (no server, no Vercel deploy; the Next.js build is a static
export bundled straight into the `.app`). No Tailwind, no shadcn — this
project uses its own element convention instead of a component library (see
"Project-specific notes" below).

## Structure
- Keep the standard AI Control scaffold: `.project`, this `CLAUDE.md`,
  `.gitignore` (always covering `.env`), `.env` for secrets, `updates/`, and
  `issues.txt`.
- **Updates live in `updates/YYYY-MM-DD NAME - OPEN|CLOSED/`.** Each holds
  `update vX.md` (goal, phased roadmap, live status) and `wiki.md` (durable
  decisions and lessons). Reopen an update by flipping `CLOSED` → `OPEN`.
- **Follow Next.js conventions.** App Router under `src/app/`; UI elements
  under `src/elements/` (see below). Keep it flat and simple — add folders
  (e.g. `src/lib/`) only when the project genuinely grows into needing them.

## Coding
- **Modular for isolated context:** every UI element is its own folder, fully
  self-contained — see "Project-specific notes" for the exact convention.
  Keep non-UI logic (when it shows up) in small modules with explicit
  interfaces, low coupling, so any part can be understood and fixed on its own.
- **Minimal:** build only what's needed; prefer reuse over duplication (a
  reusable element gets imported, never copy-pasted); don't add abstraction,
  config, or layers on speculation.
- **Test what matters:** skip tests for this UI-shell phase (no logic yet).
  Once real logic lands (lesson analysis, refocusing logic), cover that core
  logic and risky paths. Most roadmap phases end with tests that lock in what
  they built.
- **Idiomatic Next.js/TypeScript:** match surrounding code's naming and
  idioms; read the neighbors before writing. Use standard Next.js/ESLint
  tooling rather than inventing house style.

## Workflow
- **Commit AND push after every change**, one focused logical unit per commit,
  with plain honest messages. Remote is
  `github.com/stageerdman/masters-wheel` (private) — nothing important stays
  local-only. Never commit secrets; `.env` stays gitignored.
- **Non-trivial work starts with a phased roadmap** recorded in the update's
  `update vX.md`; track what's done, decided, and next as you go. Most phases
  end with tests.
- **Research spikes** for new APIs/libraries/designs (e.g. picking a video
  storage/transcoding approach later) run *outside* the main code, inside the
  update folder; capture findings in that update's `wiki.md`.
- **Act as an orchestrator:** decompose and delegate to focused agents rather
  than doing everything inline.
- **Verify by running the actual app** (`npm run dev`), not just a green
  build, before moving on.

## UX
- This is a real user-facing surface. For UX work, **launch dedicated
  UX-expert agents** to think the experience through — several in parallel for
  different parts of the surface — and synthesize.
- **Cut everything unnecessary** (Steve Jobs style): the fewest screens,
  controls, and steps that do the job. Every element must earn its place.
  Right now the UI is intentionally almost unstyled — elements get dictated
  and added one at a time, not pre-built.
- **Minimal visual system:** one font (Geist), a small deliberate color scale
  and 4 text sizes, all as CSS variables in `globals.css` — see "Styling
  standards" below. Expand the scale deliberately as real elements get
  dictated, not ad-hoc per element.
- **Reusable, isolated elements** with a clear interface (props), so each can
  be understood, restyled, or repositioned without touching the rest.
- Accessible by default: real contrast, keyboard reachability, sensible
  focus, meaningful labels; fast feedback and honest error states — once
  there's anything to give feedback on.

<!-- Local project rules below are preserved across CLAUDE.md rebuilds. -->
## Project-specific notes

### Verification constraints
**Never use the claude-in-chrome browser tool in this project.** It
restarts/reconnects the user's actual Chrome, which is disruptive — don't
invoke it, and don't try to "fix" a disconnected state by prompting for it
again. For UI verification, use `npm run build`/`lint`/`tsc --noEmit`, SSR
HTML inspection via `curl`, and reasoning through the code — then say
plainly that live click-through wasn't verified and ask the user to check
it themselves in their own browser.

**Never kill or restart the `npm run dev` server process** (no
`lsof ... | xargs kill`, no stopping/relaunching it) while it's already
running. The user keeps the app open in their own browser watching it live;
killing the dev server drops its HMR WebSocket and forces that real browser
tab to hard-reload, which reads as "restarting my browser" even though no
browser tool was touched. Turbopack's HMR already picks up every file edit
— there is normally no reason to restart. If a restart is ever genuinely
required (e.g. an env var or config change that HMR can't pick up), ask
the user first instead of just doing it.

### The element convention
Every UI element is a folder under `src/elements/` (or nested under a parent
element, see "children" below), named after the element (PascalCase). Inside:

- **`Name.tsx`** — the component. Named export `Name`, matching the folder.
  Imports its own styling and positioning modules and composes the class
  names. Contains markup and any trivial inline behavior.
- **`Name.styles.module.css`** — how the element looks: color, typography,
  borders, background. Nothing about layout or where it sits in its parent.
- **`Name.position.module.css`** — where the element sits *within its
  parent*: display mode, flex/grid child properties, margins relative to
  siblings. Nothing about color or visual decoration. A parent element is
  responsible for its children's positioning classes (not the child dictating
  its own placement), since position is a property of the relationship to the
  parent, not of the element itself.
- **`Name.script.ts`** (optional) — add only once client logic outgrows what
  reads cleanly inline in `Name.tsx` (e.g. non-trivial state machines, event
  handling shared across instances).
- **`children/`** (optional) — sub-element folders that only make sense
  nested inside this specific parent and aren't reused anywhere else. A
  reusable element (e.g. a standardized side-menu button used in multiple
  places) lives flat under `src/elements/` instead and gets imported wherever
  it's needed — never duplicated into a `children/` folder.

Both CSS modules expose a `root` class for the element's outer node at
minimum, plus additional classes for internal parts as needed. A component
combines them: `` `${styles.root} ${position.root}` ``.

`src/elements/Canvas/` is the root element (rendered by `src/app/page.tsx`)
and the live reference example of this convention — copy its shape when
adding the next element.

### Styling standards
All design tokens live as CSS variables in `src/app/globals.css`, grouped
into two tiers:

- **Core UI palette (exactly 5):** `--color-surface`, `--color-text`,
  `--color-text-muted`, `--color-border`, `--color-accent`. This is the full
  color budget for chrome — backgrounds, text, borders, focus states. Don't
  add a 6th without deliberately deciding to expand the scale.
- **Category palette (exempt from the budget above):** `--color-status-*`
  (activity-type icons) and `--color-bookmark-*` (bookmark badges), plus
  `--color-on-chip` (text/glyph color sitting on top of either). These exist
  because each value *is* a visual identity for a distinct category — a
  dollar-sign icon and a training icon must differ, a transcript bookmark and
  a notes bookmark must differ. Collapsing them into the core-5 would destroy
  the distinction they exist to draw. Add a new category color only when a
  genuinely new category is dictated, never as a substitute for a core color.
- **Text sizes (exactly 4):** `--text-size-heading` (section/page headings),
  `--text-size-body` (primary reading content — transcript/notes/lessons/main
  text), `--text-size-label` (control and list text — inputs, titles, small
  labels), `--text-size-micro` (smallest meta text — dates, badge labels).
- **Font:** `--font-family-base`, declared once on `body` in `globals.css`.
  No element sets its own `font-family`.

**Standing rule — always reference the variables.** No `Name.styles.module.css`
(or inline style) may hardcode a color or a `font-size` literal. If a new
value is needed, either reuse an existing variable or extend this token set
in `globals.css` first — never drop a one-off hex code or rem value into an
element's stylesheet. A dynamic per-instance color (e.g. which bookmark color
a badge renders) is passed through a local CSS custom property set inline
(see `--badge-color` in `BookmarkBadge.tsx`, `--icon-color` in
`VideoListItem.tsx`), which itself resolves to one of the category variables
above — never a raw hex value.

### Construction outlines
A dev-only wireframe mode exists to see every element's box boundaries at a
glance. Two pieces, both in `src/app/globals.css`:

- `--construction-outlines` (`1` = on, `0` = off) and `--color-construction`
  — the single switch and color for the whole app. Flip the variable to `0`
  to turn every outline off; this file is the one place that controls it.
- A global rule on the `[data-construction]` attribute selector that draws
  the outline on anything carrying it.

**Convention:** every element's root node, and every internal node that
carries its own `styles.*` or `position.*` class, gets a bare
`data-construction` attribute in its `.tsx`. New elements follow the same
rule as they're added — any visually distinct box should be discoverable in
construction mode, not just top-level containers.

**The `outline` CSS property is reserved for this exclusively.** Nothing
else may set `outline` — real focus rings, etc. use `box-shadow` instead
(see `SearchBar.styles.module.css`). This keeps "I see an outline on screen"
unambiguous: it always means construction mode, never real UI.

### Replicable/standardized elements
When an element needs a repeatable "standard" (e.g. every side-menu button
looks and behaves the same way), define that standard as typed props on the
shared element (e.g. `ButtonProps`) rather than branching styles per call
site. Each usage passes props; the element enforces the standard once.

### Feature tracking
`FEATURES.md` at the project root tracks, per page, what's built as UI shell
(fake data, no backend) vs. what's still to build (real functionality).
Update it whenever a feature crosses that line — it's the running source of
truth across updates, since any one `updates/` folder only covers a single
phase of work.

### Current architecture at a glance
- **Packaged as a native macOS app via Tauri** (`src-tauri/`, Rust) — not a
  website. Next.js builds to a static export (`output: "export"`); Tauri
  wraps it. No Node server at runtime, so all backend logic is Rust
  (`src-tauri/src/`) or TS calling Tauri's `fs`/`dialog` plugins directly —
  never a Next.js API route.
- **Real backend logic**, as small shelled-out modules under
  `src-tauri/src/`: `transcribe.rs` (ffmpeg/ffprobe + ElevenLabs cloud
  Speech-to-Text via `curl`), `assistant.rs` + `mcp/` (how the AI is
  handled — see below), `knowledge/` (local RAG: `fastembed` +
  `sqlite-vec` per agent), `claude_cli.rs` (the shared one-shot — no
  streaming, no MCP, no chat session — local `claude` CLI call every
  other internal AI need uses: `roleplay.rs`'s Chat Roleplay roles and
  real Scorecard generation both call it; replies are plain labeled
  lines, not JSON content, an empirically-tested choice — see
  `updates/2026-11-02 SCORECARD - OPEN/update v2.md`).
- **How the AI Assistant/Agents are handled**: there's no Anthropic API
  key anywhere — `assistant.rs` shells out to the user's own
  already-authenticated local `claude -p` CLI (`--output-format
  stream-json`, streamed back to the UI as Tauri events) for every real
  reply, the same "shell out to a real binary" pattern `transcribe.rs`
  uses for `ffmpeg`/`curl`. Tool/MCP access works via a small Rust MCP
  server (`src-tauri/src/mcp/`) the CLI is pointed at with `--mcp-config
  --strict-mcp-config --allowedTools <exact list>`; the app re-execs its
  own binary as that server (`MASTERS_WHEEL_MCP_SERVER=1`) rather than
  shipping a second bin target. Each tool lives in its own file under
  `mcp/tools/` (name + model-facing description + schema + execute fn),
  collected in `tools/mod.rs` — add tool N+1 by adding one file, not
  editing the others. Reading a record's real content
  (`get_performance_review`) is permission-gated per chat session
  (`mcp/bridge.rs`'s `SessionAccess`: tag-suggested / explicitly allowed /
  always-allowed) via an inline Decline/Allow/Always Allow chat card;
  `list_performance_reviews` (metadata only) is always ungated. Text
  documents (notes/transcript/analysis) are paginated by `offset`/`limit`
  in plain characters, not returned whole — a long transcript crossing
  the CLI's own undocumented "large tool output" size wall gets silently
  routed through a file-plus-`Read`-tool fallback instead
  (`MAX_MCP_OUTPUT_TOKENS` doesn't govern that path at all, confirmed by
  hand), and that fallback is useless here anyway since our JSON puts
  the whole document on one line and `Read` truncates long lines. Our
  own pagination avoids depending on any of that.
- **Records (Performance Review) are real Finder-visible folders** under
  `~/Documents/Master's Wheel/<Space>/records/<id>/` — `meta.json`,
  `user_notes.md`, `ai_analysis.md` (both lazily created; missing/empty
  until the user or AI actually writes to them — that's expected, not a
  bug), `transcript.md`, `scorecard.json`, `question_analysis.json`,
  `client_card.json`, `hero.<ext>`. Agents and chat
  sessions live as sibling `agents/`/`chats/` folders in the same per-Space
  root. **Spaces** (`src/lib/spaces/`) give full on-disk isolation per
  workspace — always resolve storage roots through the shared Spaces path
  helper, never hardcode `~/Documents/Master's Wheel/...` directly (three
  separate hardcodes of that exact path already caused a real bug — see
  `updates/2026-11-03 SPACES - OPEN/wiki.md`).
- **The AI Assistant and Agents are powered by the user's own local `claude`
  CLI**, not the Anthropic API — `assistant.rs` shells out to `claude -p
  --output-format stream-json`, streaming deltas back as Tauri events.
  Tool/MCP access works via a small Rust MCP server
  (`src-tauri/src/mcp/`) that the CLI is pointed at with `--mcp-config
  --strict-mcp-config --allowedTools <exact list>`; the app re-execs its
  own binary as that server (`MASTERS_WHEEL_MCP_SERVER=1`) rather than
  shipping a second bin target. Each tool lives in its own file under
  `mcp/tools/` (name + model-facing description + schema + execute fn),
  collected in `tools/mod.rs` — add tool N+1 by adding one file, not
  editing the others. Reading a record's real content
  (`get_performance_review`) is permission-gated per chat session
  (`mcp/bridge.rs`'s `SessionAccess`: tag-suggested / explicitly allowed /
  always-allowed) via an inline Decline/Allow/Always Allow chat card;
  `list_performance_reviews` (metadata only) is always ungated. Large
  text documents (e.g. a long `transcript.md`) are read in bounded
  chunks via `offset`/`limit` on `get_performance_review`, not read whole
  — a tool result has to fit the CLI's MCP output-size limit.

### What's deliberately not built yet
- Real AI-generated analysis: `ai_analysis.md` exists and persists real
  data, but nothing populates it with a real model pass yet. (The
  Scorecard's own generation is real now — see "Current architecture at a
  glance" below.)
- App accounts/auth of its own, a remote database, Windows/Linux
  packaging, code signing/notarization — all out of scope so far. The one
  sign-in that exists is the optional Microsoft/OneDrive connection
  (Settings → Storage; see `updates/2026-11-25 ONEDRIVE - OPEN/`), which
  needs `ONEDRIVE_CLIENT_ID` in `.env`.
