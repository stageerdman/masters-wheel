# Features

Running tracker: what's built (as UI shell — fake data, no backend) vs. what
still needs to be dictated and built. Update this whenever a feature moves
between the two lists. Each page gets its own section as pages get added.

## Packaging (native app)

### Built
- [x] Packaged as a native macOS app via Tauri: Next.js builds to a static
      export (`output: "export"`), and Tauri wraps it in a real `.app`
      bundle (`npm run app:build`) instead of a browser tab. UI shell is
      unchanged — this only changes how it's launched/distributed.

### To build (real functionality — not started)
- [ ] Windows/Linux packaging (macOS-only for now)
- [ ] Code signing / notarization for distribution outside this machine

## AI Assistant (global — every page)

### Built — real backend
- [x] Real replies: the user's own authenticated local Claude Code CLI,
      invoked headlessly (not the Anthropic API — see
      `updates/2026-10-30 AGENTS-ENGINE - OPEN/wiki.md`), streamed in
      token-by-token. Session continuity via a resumed `claudeSessionId`
      per chat session.
- [x] Knowledge grounding (real RAG, Tier 2 — local embeddings + vector
      search, no server/API key): an agent's knowledge files are
      extracted, chunked, and embedded on-device (`fastembed`), stored in
      a per-agent SQLite + `sqlite-vec` database, and the chunks most
      relevant to each message are retrieved and woven into that turn's
      system prompt — bounded context cost no matter how large the
      underlying knowledge base is.
- [x] Persona-break fix: `assistant.rs` now calls the CLI with
      `--system-prompt` (replaces Claude Code's own default system prompt)
      instead of `--append-system-prompt` (which left it in place
      alongside the persona). Appending left two contradicting identities
      in context — confirmed by hand the model would resolve that by
      explicitly disregarding the persona and self-identifying as Claude
      Code, especially when asked directly what it is/can do; replacing
      removes the contradiction outright. Every agent's system prompt is
      also unconditionally wrapped in `<persona>` tags + a "stay fully in
      character" rule (not just agents with knowledge files) as a second,
      defensive layer. See
      `updates/2026-11-01 MULTI-AGENT-CHAT - OPEN/wiki.md`.
- [x] No default/generic assistant persona. Sending requires exactly one
      real agent active in the chat (dragged in, clicked, or @mentioned);
      0 or 2+ active agents blocks sending with an inline system message
      instead of falling back to a generic voice.
- [x] The chat roster is the same real, persisted `Agent` as the `Agents`
      builder page — not a separate fixture list (see the Agents page
      section below; this was previously an explicitly deferred decision).
- [x] Messages render real markdown (headings, bold/italics, lists,
      blockquotes, tables, links, inline/fenced code) instead of plain
      text — see `updates/2026-10-30 CHAT-UX - OPEN`. Fenced code blocks
      get a monospace font (Geist Mono, a deliberate one-case exception
      to the single-font rule) and a bordered box, but no per-token
      syntax-highlighting colors — that would need a many-color token
      budget the app's deliberate 5-color core palette doesn't have.
      `@mention` highlighting still works inside markdown (bold text,
      list items, etc.) via a custom remark plugin.
- [x] Opening a brand-new, nobody-picked-yet chat shows an agent picker
      (`AgentPicker`) in the chat column instead of the empty composer —
      "who do you want to chat with?" is now the first thing. A header
      button starts a genuinely new chat (previously there was exactly
      one blank session created at mount and no way to get back to that
      state after navigating away from it). A draft session is marked
      explicitly (`ChatSession.isDraft`), not inferred from having no
      agent/messages — a real, legitimately-empty session can't get
      mistaken for one.
- [x] A dedicated chat's empty state shows that agent's own profile
      (photo, name, description) instead of "Ask anything.", and every
      one of that agent's replies carries a tiny avatar + name label —
      which agent you're talking to stays visible the whole conversation,
      not just at the start.
- [x] `HistoryList` shows each past chat's title, how long ago it was,
      and a tiny photo of its agent next to the date — a session's
      "primary" agent is its dedicated `agentId` if there is one, else
      the first `activeAgentIds` entry. Draft (nobody-picked-yet)
      sessions are filtered out of history entirely rather than showing
      as a fake "Now" entry. Right-clicking a history entry offers
      "Delete chat" (native confirmation first, not undoable); deleting
      the active chat falls back to the next most-recently-used one, or
      a fresh draft if none are left.
- [x] The window itself is a real glass surface ("Dock" concept, explored
      as a standalone HTML artifact first — see
      `updates/2026-10-30 CHAT-UX - OPEN`): transparent background +
      `backdrop-filter: blur(4px)` + a hairline border + a faint diagonal
      sheen, one blur region for the whole window (not one per
      sub-panel, deliberately, for performance) — `Sidebar`/`Composer`/
      the chat column all dropped their opaque fill so it shows through
      consistently.
- [x] Every place an agent appears in the chat (`AgentRosterItem`,
      `AgentPicker`, `AgentStrip`, `HistoryListItem`, the `@mention`
      picker in `Composer`) renders its real uploaded photo via the
      shared `AgentAvatar` element, falling back to the initial-letter
      badge only when no photo was uploaded; a blank `description` falls
      back to "No description yet." instead of an empty line
      (`src/lib/agents/description.ts`).

### Built (UI shell only — no real functionality behind it)
- [x] `AIAssistant` replaces the Next.js dev-mode badge: fixed bottom-left
      trigger icon (3 rotating unfinished concentric rings), lives above
      every route via the root layout
- [x] Pressing the trigger expands it into a floating window anchored at
      that corner; a header h-line button collapses it back (both
      directions animate, with a reduced-motion opacity-only fallback)
- [x] Chat content: message list (user bubbles vs. flush assistant text),
      auto-growing composer; empty state is that agent's own profile (see
      "Built — real backend" above) with "Ask anything." as the generic
      fallback for the rare case of no agent at all
- [x] Drag the header to snap the window between 2 docked forms — left
      (small, default, bottom-left) and center (bigger, horizontally
      centered) — both bottom-flush, top-rounded corners only; a
      ghost-box preview of the exact landing geometry shows while
      dragging, with the targeted zone highlighted; disabled below
      640px viewport width
- [x] Drag the window's top-right corner to manually resize whichever
      dock is active; redocking (dragging the header again) always
      snaps back to that zone's predefined size
- [x] Hold Option/Alt while dragging the header or resizing to redefine
      whichever preset (left/center) is currently active — not a
      separate freeform mode, the preset itself permanently takes on the
      new position/size, persisted to `localStorage`; a plain drag still
      always snaps between the 2 presets, now rendering each one's saved
      override if it has been redefined
- [x] Header's side-menu button (left) toggles a `Sidebar` as a real
      split layout — it pushes/narrows the chat column (flex width,
      like Claude's sidebar), not an overlay; collapse button sits on
      the header's right side
- [x] `Sidebar` is a single stacked panel, no tab switcher: `AgentStrip`
      (icon + name, ordered by how recently each agent was chatted with,
      scrolls horizontally rather than wrapping) sits above a small
      standardized "History" label and `HistoryList` below it. Below
      ~480px of content width, the sidebar takes over the whole content
      area instead of splitting (phone-drawer behavior) — closing it is
      the only way back to the chat at that size.
- [x] `HistoryList` switches between past sessions; `AgentStrip` lets you
      click an agent to immediately open your one dedicated chat with
      them, creating it on first click and reusing it after. No
      drag-and-drop — dropped as confusing, UI-only clutter (it added an
      agent to a persistent, separately-tracked "active" roster that
      didn't actually reflect who'd said anything).
- [x] Typing `@` in the composer opens a picker (with real agent photos)
      filtered by what you type (click or Arrow keys + Enter/Tab to pick,
      Escape to dismiss); selecting an agent inserts `@AgentName` in the
      message, rendered as a styled accent tag once sent. Mentioning
      someone only affects who replies to that one message (see below) —
      it no longer adds a persistent chip/"added to the conversation"
      notice to the chat (dropped for the same reason as drag-and-drop
      above: the signal worth keeping is who's actually *replied*, which
      now lives in `HistoryList` instead — see `resolveRespondedAgents`).
- [x] Mention-addressed multi-agent replies: a message with no @mention
      gets a reply from the one agent the chat is dedicated to
      (`session.agentId`); @mentioning one or more agents overrides that
      for just that message — exactly the mentioned agents reply, each
      dispatched in parallel (no turn-taking, no moderator) and each
      under their own avatar (`message.agentId`). Each agent keeps its
      own private resumed Claude Code CLI session even inside a shared
      thread (`ChatSession.claudeSessionIds`, keyed by agent) — one
      agent's replies are never fed into another's native session;
      cross-agent awareness instead comes from injecting a speaker-
      labeled transcript delta (everything since that agent's own last
      reply) into its turn's input. See
      `updates/2026-11-01 MULTI-AGENT-CHAT - OPEN`.
- [x] Chat sessions and their messages persist across reloads —
      `src/lib/chat` writes one real file per real conversation under
      the app's own data directory (same on-disk-JSON precedent as
      `src/lib/agents`), loaded back into `HistoryList` on next open.
      Draft ("pick someone") sessions stay ephemeral/in-memory only, never
      written to disk.
- [x] `HistoryListItem` shows the real photo of every distinct agent
      that has actually replied in that chat (`resolveRespondedAgents`,
      computed from message authorship), not just the chat's dedicated
      agent — a thread where you brought in someone else via `@mention`
      shows that here.
- [x] Right-clicking a chat in history also shows a real context-usage
      gauge (`ContextUsageGauge`, in `ContextMenu`'s new optional header
      slot): a 0–100 bar (green → amber → red, reusing the existing
      status colors as a fill ramp — see its own comment for why that's
      not a new 6th color) plus a compact token count ("400k"), for
      whichever agent in that chat is closest to filling its context
      window. Powered by real numbers from the CLI's own `usage`/
      `modelUsage` report on every reply (`assistant.rs`'s
      `extract_context_usage`), persisted per-agent
      (`ChatSession.contextUsage`) alongside `claudeSessionIds`.
- [x] A chat is auto-named off its first message, the same beat Claude/
      ChatGPT do it at — a new, cheap, one-shot, non-persona Rust command
      (`name_chat`, deliberately separate from `ask_agent`: no `--resume`,
      no MCP tools, no persona system prompt) fires once per session right
      after the first user message sends.
- [x] Picking an agent for a new chat no longer hits disk or shows in
      History by itself — `ChatSession.isDraft` now only flips to `false`
      (and the session only gets its first `saveSession`) once an actual
      message sends. Picking an agent just switches the chat column's
      view (`AgentPicker` → composer); abandoning a picked-but-unsent chat
      leaves nothing behind.
- [x] A new chat's default title (before auto-naming lands, or if it
      fails) is the tagged/suggested Performance Review record's own
      title when one exists ("the client we're talking about"), falling
      back to "Chat with {agent}" otherwise.
- [x] Right-click → **Rename** in `HistoryListItem`, inline-edit (click-
      to-edit input, same idiom as `Hero`'s record title) committed on
      blur/Enter, discarded on Escape.
- [x] Selecting a chat or starting a new one auto-collapses the sidebar,
      but only once it's actually acting as a full-width overlay (the
      same `@container window-content (max-width: 480px)` breakpoint
      `Sidebar` already had) — untouched in the normal side-by-side
      layout. A new shared `src/lib/useNarrowContainer.ts` hook mirrors
      that CSS breakpoint in JS for this one decision that can't be
      expressed in CSS alone.
- [x] A full-screen "universal" chat page at `/chat` (`ChatPage`), wired
      to Main Menu's previously-unwired "Chat with AI" item — the same
      engine and the same designed chat experience as the floating
      widget (`Sidebar`/`AgentPicker`/`TagBar`/`MessageList`/`Composer`,
      reused unchanged, not copy-pasted), just laid out full-screen with
      a persistent, default-open sidebar showing every chat in the active
      Space. Its own independent `useAIAssistant()` instance — disk is
      the shared source of truth, not any live cross-instance link, which
      is why the floating widget hides itself entirely on this route
      (`AIAssistant.tsx`'s `HIDDEN_ON_ROUTES`) rather than risk two
      out-of-sync copies of the same chat state on screen at once. Landing
      this page also meant promoting `Sidebar`/`AgentPicker`/`Composer`/
      `MessageList`/`TagBar` (and their own nested children) out from
      under `AIAssistantWindow/children/` to flat `src/elements/`, per
      this project's own element convention, now that they have a second
      consumer.

### Built — MCP tool calling (Performance Review visibility)
- [x] Every reply is now generated with two real MCP tools granted
      (`--mcp-config`/`--strict-mcp-config`/`--allowedTools`, pointing
      at this app's own re-exec'd binary — see
      `src-tauri/src/mcp/server.rs`): `list_performance_reviews`
      (metadata only — id/date/status/description, always available,
      never gated) and `get_performance_review` (real notes/transcript/
      analysis content, gated).
- [x] A visible tag chip bar between the window header and the chat
      (`TagBar`/`TagChip`) — "suggested" (dashed, muted) follows
      whichever Performance Review record is currently open
      (`src/lib/mcp/activeRecord.ts`); "active" (solid, accent) means
      the AI has actually read that record. Both removable via a
      hover-revealed ×. Scoped to one chat session — switching chats
      starts with none, switching back restores them.
- [x] Reading an untagged, un-always-allowed record triggers an inline
      permission card (`PermissionRequest`) with Decline / Allow /
      Always Allow, backed by a local bridge
      (`src-tauri/src/mcp/bridge.rs`) that actually blocks the tool call
      until the user answers (or 180s elapses, auto-declining). Resolved
      cards collapse to one line ("You declined/allowed/always allow…").
- [x] Reading a suggested-tagged record promotes it to active
      automatically, no prompt.

### To build (real functionality — not started)
- [ ] More MCP tools beyond Performance Review (e.g. Agents, Notion) —
      the per-tool pattern in `src-tauri/src/mcp/tools/` is in place,
      nothing else wired yet
- [ ] Keyboard-only path to cycle dock states / toggle the side menu
      (currently pointer-only)

## Spaces (global — every page)

### Built — real backend
- [x] Multiple isolated Spaces, each with a genuinely separate set of
      Agents, chat history, and Performance Review records — not a UI
      filter over shared data. Every Space's data lives together under one
      real, Finder-visible folder: `~/Documents/Master's Wheel/
      <Space name>/{agents,chats,records}/`, with a `spaces.json` registry
      (id/name/icon/folder) alongside the Space folders, not inside any of
      them. `src/lib/spaces` owns the registry and active-Space store;
      `src-tauri/src/spaces.rs` owns the one-time migration.
- [x] First launch after this feature shipped auto-migrated all
      pre-existing data (Agents and chats, previously under the hidden app
      data dir; Performance Review records, previously flat under
      `~/Documents/Master's Wheel/`) into a `Default` Space, via real
      filesystem renames (not byte-copies, so even large videos moved
      instantly) — copy-then-delete-source only as an `EXDEV`
      cross-device fallback. See this update's `wiki.md`.
- [x] Switcher lives in Main Menu's top-right corner (`SpaceSwitcher`):
      just the current Space's icon, no label/background chrome at rest —
      click opens a dropdown of every Space (icon + name) plus "Add
      Space". Icons are a curated `@phosphor-icons/react` duotone set (32
      of them), rendered as one uniform white glyph per Space (the icon
      identifies the Space, not a color). The dropdown clamps to the
      viewport (`AnchoredPopup`'s own fix, shared by every other consumer
      of that element too) — it previously overflowed off-screen for a
      trigger this close to the corner.
- [x] "Add Space": name + icon-grid picker, creates the Space's on-disk
      folders and switches into it immediately — a brand-new Space starts
      with zero Agents, zero chat history, and zero records, including in
      the always-mounted AI Assistant (which resets its in-memory state on
      every Space switch, not just on next open).
- [x] Right-click a Space in the dropdown → "Edit Space" (rename + change
      icon — a name change renames the real on-disk folder too, since the
      folder name is derived from the display name; collision-checked the
      same way a new Space's folder name is) or "Delete Space" → a modal
      requiring the literal word "delete" typed in before the button
      enables — the highest-stakes destructive action in the app (an
      entire Space's Agents/chats/records, gone at once), so a higher bar
      than this app's usual native-confirm pattern. Deleting the active
      Space switches to another remaining one first; the last remaining
      Space can't be deleted ("Delete Space" is omitted from the menu
      entirely for it, not shown disabled).

### To build (real functionality — not started)
- [ ] Reordering Spaces in the dropdown
- [ ] Per-Space UI preferences (e.g. `StatFilterBar`'s saved date range,
      the AI Assistant dock position) are still global `localStorage`
      keys, not Space-scoped — low-priority, flagged but not built this
      round

## Main Menu page

### Built (real functionality)
- [x] Top-right corner: `SpaceSwitcher` — see the "Spaces" section above
      for the full feature; this page is just where it's mounted.

### Built (UI shell only — no real functionality behind it)
- [x] `MainMenu` at `/`: wallpaper background, left `NavMenu` (5 items:
      Performance Review, Analytics, Training, Chat with AI, Agents), right
      `SidePanel` (empty until Analytics is activated)
- [x] `NavMenu`: arrow-key highlight + Enter activates; mouse hover
      highlights, click activates (same effect as keyboard); highlighted
      item shows an arrow marker
- [x] Performance Review activation navigates to `/performance-review`;
      Agents activation navigates to `/agents`; Chat with AI activation
      navigates to `/chat` (see `ChatPage` in the AI Assistant section)
- [x] Analytics activation toggles `AnalyticsPanel` in/out of the right
      panel (now the whole right side of the screen, not a narrow column)
      with a pop-in/pop-out animation — doesn't navigate; activating it
      again while open closes it
- [x] Statistics are now a standardized, reusable system instead of one
      hardcoded panel, with a settled vocabulary: a **Space** (`StatSpace`)
      is one page of statistics and holds a **Grid** (`StatGrid`); a Grid
      is made of **Slots** (`StatSlot` — a position + optional size); each
      Slot holds one **Widget** (`StatWidget` — the standalone thing that
      actually renders a statistic, minimal 1x1 footprint, its own
      glass-box look, its own staggered pop-in). `src/lib/statistics` is
      the separate data registry (id → label + `compute(filters)`) each
      Widget's value comes from. `AnalyticsPanel`/`SidePanel` are fully
      transparent shells around a `StatSpace` — no panel-level box or
      heading. 6 real statistics now: **Meetings** (real on-disk records,
      always excludes practice/training — pinned via `fixedFilters` so
      the global session-type filter can't override it), **Closed**,
      **Closed amount** (sum of closed deals' offered amount), **Real
      close rate** (closed ÷ closed+failed, excluding not-qualified
      leads), **Close rate** (closed ÷ closed+failed+not-qualified),
      **Lost amount** (sum of failed deals' offered amount — how much
      money walked away) — all 6 respect the filter bar's date range;
      adding a new stat anywhere in the app means adding one registry
      entry + one Slot, not a new
      panel. Grid cells are 75% of their original size — finer spots for
      the same widgets
- [x] `StatWidget` is a shell (glass box + pop-in) around a `children/`
      content component — `SingleStat` is the first one, centering one
      value + label dead in the middle. Future widget types (a chart,
      etc.) join as siblings under `StatWidget/children/`
- [x] `StatGrid` keeps a bounded 8-cell buffer of empty slots beyond the
      real widgets (grows only when a real widget actually eats into that
      buffer, not from scroll position); `StatSpace` is just the scroll
      viewport, with a hidden scrollbar and a soft fade at the top/bottom
      edges instead of a hard clip
- [x] `StatFilterBar`: an invisible row above the Grid (scrolls away with
      it, not sticky). A date-range chip (3-column popup: presets, start
      calendar, end calendar with day/month/year drill-down) plus a "+"
      add-filter button at the end that opens a menu of filter types not
      yet active — one today, **Session type**, whose options are read
      live off Performance Review's own call-state registry. Both the
      date range and any added filters persist across restarts and are
      actually wired into what each statistic computes
- [x] Training: listed, selectable, inert (no behavior dictated yet)
- [x] `NavMenu` items aren't text-selectable (they're controls, not
      reading content)
- [x] `AppHeader` wordmark is now a link home (`/`) and is brand-aware via
      `HeaderActionsContext` — shows "Master's Wheel" by default, swaps to
      "Performance Review" + logo while that page is mounted; header is
      hidden entirely on Main Menu (`/`)

### To build (real functionality — not started)
- [ ] Training behavior (not dictated yet)
- [ ] Multiple Spaces (swipe/page between `StatSpace` pages, each holding
      its own Grid); live edit mode (drag to add/remove/resize/reorder
      Widgets) — see `updates/2026-10-30 ANALYTICS - OPEN`

## Performance Review page

### Built (UI shell only — no real functionality behind it)
- [x] App header (global orientation bar)
- [x] 3-column layout: Navigation / Hero / Detail
- [x] Navigation: search bar (client-side filter over the real record list)
- [x] Navigation: scrollable list, call-state icon (closed/training/
      postponed/failed/not qualified, or no icon at all for a freshly
      added, unclassified record), date + title rows, description shown
      as a hover tooltip
- [x] Hero: title (click to rename inline), bookmark rail (AI analysis /
      Transcript / Notes / Core Lessons)
- [x] Hero: Core Lessons (locally editable, not persisted — deliberately
      deferred this round, see this update's wiki.md)
- [x] Hero: collapsible meta panel (3-dot toggle under the title) —
      meeting date + closed date, offered amount + currency (typeahead
      combobox), 200-char description
- [x] Detail: draggable bookmark rail, reorderable, splits into two
      independent text panes when a bookmark crosses the line
- [x] Scorecard (5th bookmark, "SC"): 11 fixed criteria (Frame Setting
      through Resolving Limitation), each rated Skipped/Poor/Good/Great/
      Outstanding with a color-coded pill (Outstanding gets an animated
      gradient/glow) and a hover tooltip explaining both the criterion and
      the rating level. Empty state is just a "Generate Scorecard" button;
      a document button next to the title opens a modal with the AI's full
      reasoning per item and a clickable timestamp that seeks the real
      video. An improvement-suggestion line sits below the rows. "Generate"
      fabricates a fake result (no real AI call this round — see
      `updates/2026-11-02 SCORECARD - OPEN/wiki.md`), not random/no-op.
- [x] Header: 3-area layout (logo / dynamic island / reserved), dynamic
      island shows the active record's state (clickable, changes it; each
      option's hover tooltip explains what that status means; an empty,
      still-clickable slot when unclassified — no placeholder glyph),
      plus an inert AI-reanalyze button, an inert "send to training
      ground" button, and a real "mark as reviewed" check toggle

### Built (real functionality)
- [x] Real local storage: every record is a real folder under
      `~/Documents/Master's Wheel/`, created on demand; `meta.json` holds
      structured fields (title, meeting date, closed date, state, offered
      amount/currency, description); `user_notes.md`/`ai_analysis.md` are
      created lazily — only once the user actually types something
      non-empty; `scorecard.json` is written once a scorecard has been
      generated (the generation itself is still fake this round — see
      "To build" below)
- [x] Adding a record: click the always-last "Add record" row (native file
      dialog) or drag a file anywhere onto the page (Tauri's native
      window-level drag-drop, not a sandboxed HTML5 drop, with a visible
      drop-zone highlight while hovering) — both copy the file in as
      `hero.<ext>` and seed a fresh, unclassified (`state: null`) record
- [x] Real media playback: `MediaPlayer` plays a record's actual hero file,
      streamed by a small local HTTP server (`src-tauri/src/media_server.rs`,
      `127.0.0.1:47821`) rather than Tauri's `asset://` protocol/
      `convertFileSrc` — that protocol buffers an entire file into memory
      for any request without a Range header, which made the longest
      recordings in this library (~1.5GB+) fail to load at all. If a
      record has no hero file, Hero shows an "Upload video" button
      instead of the player (see the upload entry below).
- [x] AI analysis and Notes are both real, editable `.md` files on disk
      (debounced writes), not in-memory fakes
- [x] Title, meeting date, closed date, state, offered amount/currency,
      and description all persist to `meta.json` (debounced writes).
      Closed date auto-fills with today the moment state first becomes
      "closed" (never overwrites a manually-set date); both dates stay
      manually editable afterward
- [x] "Reviewed" flag: header check button toggles whether the user has
      personally reviewed a call; persists to `meta.json`. A reviewed
      record gets a subtle green accent in the Navigation list.
- [x] Open count: how many times each record has been selected/opened is
      tracked and persisted to `meta.json` (no UI surface yet — logged
      for future use)
- [x] Transcript: real `transcript.md` per record, imported via a
      dedicated "Upload a transcript" popup (own drag & drop zone, kept
      deliberately separate from the page's video drop so the two never
      collide — see this update's wiki.md) or a native file picker.
      Currently recognizes one source format (frontmatter + `**Speaker**
      [mm:ss]` blocks); `src/lib/transcript` is built to accept more
      formats later without changing the UI. Imported transcripts are
      rewritten to one canonical, standardized timestamp format on disk.
      Lines are color-coded per speaker, clicking a line seeks + plays the
      real video, right-click renames a speaker everywhere (UI and the
      source file).
- [x] Right-clicking a record in Navigation opens a context menu: "Open
      folder in Finder" (reveals the record's real on-disk folder),
      "Remove video" (shown only if a hero file exists — deletes just
      `hero.<ext>`, leaving notes/transcript/meta intact so a new video
      can be uploaded in its place), and "Remove record" (deletes the
      whole folder). Both deletions ask for native confirmation first —
      neither is undoable. When a record has no hero file, Hero's media
      slot shows an "Upload video" button instead of the player; it opens
      a dedicated drag & drop popup (same shape as the transcript upload
      modal, its own mutually-exclusive window-drop target) to set that
      record's hero file.

### To build (real functionality — not started)
- [ ] Real transcription generation
- [ ] Real AI analysis generation (the slot is now a real, editable file —
      something still has to actually write useful content into it; the
      header's AI button is still a no-op placeholder)
- [ ] Real Scorecard generation (currently fabricates a fixed fake result
      — `src/lib/scorecard/generate.ts` — rather than actually analyzing
      the transcript)
- [ ] AI-assisted core lesson extraction; Core Lessons persistence (still
      in-memory only this round — deliberately deferred)
- [ ] Attachments UI (the `attachments/` folder convention is decided, no
      upload/list/remove flow yet)
- [ ] "Take it to the training ground" button (currently a no-op
      placeholder — behavior not yet dictated)
- [ ] Windows/Linux support for the native fs/dialog plumbing (macOS-only
      verified so far)
- [ ] Auth (not started — no users yet)

## Training Room page

A practice space, deliberately **not tracked in performance** (unlike
Performance Review) — scalable by "training tool"; the first tool is
**Voice Practicing**. See `updates/2026-11-06 TRAINING-ROOM - OPEN/`.

### Built (UI shell — session metadata is in-memory fake data; clip files are real)
- [x] Same 3-column layout as Performance Review (Navigation / Hero /
      Detail), reusing (and generalizing) its shared primitives —
      `BookmarkBadge`/`BookmarkRail`/`SplitRail`/`useSplitRail` are no
      longer hardcoded to Performance Review's 5 content kinds.
- [x] Navigation: pinned "Add training practice" (+) above the list, Open
      Sessions (sorted by recency of last **update**, not last opened —
      selecting a session is navigation, not an edit, see wiki) and
      Closed Sessions groups below it. Each row: fixed type glyph (per
      tool type, never user-adjustable), click-to-rename name, relative
      "last updated" label (`1d`/`30d`/`2mo`/`1y`,
      `src/lib/formatShortRelativeTime.ts`). Right-click: "Close session"
      (green ✓) / "Reopen session", and "Remove session" (destructive,
      native confirmation first, also deletes its real clip-storage
      folder).
- [x] Hero (Voice Practicing): empty "Upload a clip" placeholder; once
      clips exist, a scrollable Facebook-feed-style list (newest on top,
      "+ Add another clip" pinned above it) — each clip is a real
      video-or-audio element (reuses `VideoUploadModal`, no extension
      filtering) with an optional "Generate transcript" button per clip.
      The picked file is copied into real on-disk Space storage
      (`src/lib/training`, a `training/<sessionId>/` folder) before
      playback — a picked path is almost never inside Tauri's asset
      protocol scope on its own, so playing it directly silently failed
      until this fix (see wiki).
- [x] Lyrics-style synced transcript (new `LyricsTranscript` element):
      word-by-word highlight driven by the clip's real `timeupdate`,
      click any word to seek — built on real per-line timestamps but
      *approximated* per-word spans (ElevenLabs' real word timings exist
      but are currently discarded at serialize time everywhere, not just
      here — see the wiki for why this is a shared, not Training-Room-
      specific, gap).
- [x] "Generate transcript" fabricates one fixed example after a short
      delay (same no-real-AI-yet shape as Performance Review's "Generate
      Scorecard").
- [x] Detail: Notes, through the same generic split-rail mechanism as
      Performance Review's Detail, seeded with a single "notes" kind for
      now (dragging it is a no-op with only one kind — nothing to split
      against yet).
- [x] Dropping a file anywhere on the page appends it as a new clip to
      the selected session's feed (Tauri native window-level drag-drop).

### To build (real functionality — not started)
- [ ] Real on-disk storage for session *metadata* (name, status, notes,
      which clips belong to it) — clip files themselves are already real
      (`training/<sessionId>/`), but the session list is still in-memory
      and resets on reload/restart.
- [ ] Real transcript generation (ElevenLabs), and persisting real
      per-word timestamps so the lyrics highlight is exact instead of
      interpolated.
- [ ] More training tools beyond Voice Practicing.
- [ ] Wiring Performance Review's "Take it to the training ground" button
      (still a no-op) to actually open/seed a Training Room session.

## Agents page

### Built — real backend
- [x] Agents are real and persisted: one folder per agent under the app's
      own data directory (`<app data>/agents/<id>/agent.json` +
      `versions.json`), not in-memory fixtures — see `src/lib/agents`.
      Creating, editing, saving, and version history all survive a
      reload.
- [x] Knowledge files are real: picked via the native file dialog
      (`.txt`/`.md`/`.pdf`), copied in, and indexed for retrieval (extract
      → chunk → embed locally → store) — see `src-tauri/src/knowledge/`.
      An agent's knowledge is retrieved and grounds its replies in the AI
      Assistant chat, not just displayed as a file list.
- [x] One shared `Agent` type with the AI Assistant's chat roster — no
      more separate fixture type to keep in sync (previously deferred,
      see `updates/2026-10-30 AGENTS-ENGINE - OPEN/wiki.md`).
- [x] Real photo upload/storage: picked via the native file dialog or a
      window drop, decoded/resized/encoded on the Rust side
      (`src-tauri/src/avatar.rs`) into a persistable `data:` URL — not a
      `blob:` object-URL preview, so it survives a reload (see
      `src/lib/agents/photo.ts`).

### Built (UI shell only — no real functionality behind it)
- [x] `Agents` at `/agents`: left `AgentNav` roster / right `AgentEditor`,
      same 2-column shape as Performance Review's navigation+detail split
- [x] `AgentNav`: "Add new agent" row always first (same shape as a normal
      row, `+` instead of a photo); scrollable list of created agents,
      active-row highlight, empty-roster and untitled-draft states
- [x] `AgentEditor` identity header: photo (local file picker preview, no
      upload), Name, `@Nickname` (auto-derives from Name until the user
      types a different value directly into it, then locks; clearing it
      back to empty unlocks and re-derives), Description — all inline-
      editable
- [x] Instructions: large textarea; typing `@` opens a picker over this
      agent's own knowledge files (substring match); a saved reference
      renders as a styled tag once the field is blurred, same visual
      language as the AI Assistant's chat-mention tags; a reference to a
      since-removed file just reverts to plain text
- [x] Knowledge: add real files via a native file picker or a persistent
      "+ Add file" row, remove via a per-row button; real size/type
      metadata plus a real indexed-chunk count per file (no more fake
      context-window percentage meter — retrieval means file size isn't
      a hard context budget anymore, see this update's wiki.md)
- [x] Save button only appears while there are unsaved edits, with a
      brief "Saved" confirmation; Version History opens a right-side
      panel (reusing the AI Assistant Sidebar's push-split mechanic) of
      past saves with auto-computed change labels, restorable (confirms
      first only if there are unsaved edits to discard)
- [x] Cmd+Z / Cmd+Shift+Z undo/redo every field, even before the first
      Save — text fields commit to the undo stack on blur (native
      per-field undo keeps working while focused); Save clears the stack
- [x] `src/lib/useMentionPicker.ts`: the AI Assistant chat Composer's
      @mention picker, generalized over `{ name: string }` and now shared
      by both features

### To build (real functionality — not started)
- [ ] Only `.txt`/`.md`/`.pdf` knowledge files are supported; `.xlsx`/
      other types are rejected with an error rather than silently failing
- [ ] Tool/MCP calling, and multi-agent replies — same as the AI
      Assistant's "to build" list above, since both features now share
      one real backend
- [ ] Auth (not started — no users yet)
