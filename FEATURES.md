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
      `ActiveAgentChip`, `AgentPicker`, `AgentStrip`, `HistoryListItem`)
      renders its real uploaded photo via the shared `AgentAvatar`
      element, falling back to the initial-letter badge only when no
      photo was uploaded; a blank `description` falls back to "No
      description yet." instead of an empty line
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
      click an agent to immediately open a dedicated chat with them
      (creating it on first click, reusing it after), or drag one onto
      the chat to add it alongside — shows an `ActiveAgentChip` + a muted
      system line, no fake agent reply
- [x] Typing `@` in the composer opens a picker filtered by what you type
      (click or Arrow keys + Enter/Tab to pick, Escape to dismiss);
      selecting an agent inserts `@AgentName` in the message. Sending a
      message with a mention renders it as a styled accent tag in the
      chat (like tagging a user in a normal chat app) and brings that
      agent into the conversation the same way dragging their roster
      card does

### To build (real functionality — not started)
- [ ] Multi-agent replies in one thread (2+ active agents currently
      blocks sending rather than dispatching to all of them)
- [ ] Tool/MCP calling (e.g. Notion) — no tool access is granted to a
      reply yet
- [ ] Persisting chat sessions across reloads (dock placement can now
      persist via Option-place; sessions/messages still reset)
- [ ] Keyboard-only path to cycle dock states / toggle the side menu
      (currently pointer-only)

## Main Menu page

### Built (UI shell only — no real functionality behind it)
- [x] `MainMenu` at `/`: wallpaper background, left `NavMenu` (5 items:
      Performance Review, Analytics, Training, Chat with AI, Agents), right
      `SidePanel` (empty until Analytics is activated)
- [x] `NavMenu`: arrow-key highlight + Enter activates; mouse hover
      highlights, click activates (same effect as keyboard); highlighted
      item shows an arrow marker
- [x] Performance Review activation navigates to `/performance-review`;
      Agents activation navigates to `/agents`
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
      heading. 5 real statistics now: **Meetings** (real on-disk records,
      always excludes practice/training — pinned via `fixedFilters` so
      the global session-type filter can't override it), **Closed**,
      **Closed amount** (sum of closed deals' offered amount), **Real
      close rate** (closed ÷ closed+failed, excluding not-qualified
      leads), **Close rate** (closed ÷ closed+failed+not-qualified) — all
      5 respect the filter bar's date range; adding a new stat anywhere
      in the app means adding one registry entry + one Slot, not a new
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
- [x] Training / Chat with AI: listed, selectable, inert (no behavior
      dictated yet)
- [x] `NavMenu` items aren't text-selectable (they're controls, not
      reading content)
- [x] `AppHeader` wordmark is now a link home (`/`) and is brand-aware via
      `HeaderActionsContext` — shows "Master's Wheel" by default, swaps to
      "Performance Review" + logo while that page is mounted; header is
      hidden entirely on Main Menu (`/`)

### To build (real functionality — not started)
- [ ] Training and Chat with AI behavior (not dictated yet)
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
      non-empty
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
- [ ] AI-assisted core lesson extraction; Core Lessons persistence (still
      in-memory only this round — deliberately deferred)
- [ ] Attachments UI (the `attachments/` folder convention is decided, no
      upload/list/remove flow yet)
- [ ] "Take it to the training ground" button (currently a no-op
      placeholder — behavior not yet dictated)
- [ ] Windows/Linux support for the native fs/dialog plumbing (macOS-only
      verified so far)
- [ ] Auth (not started — no users yet)

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
