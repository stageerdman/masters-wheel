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

### Built (UI shell only — no real functionality behind it)
- [x] `AIAssistant` replaces the Next.js dev-mode badge: fixed bottom-left
      trigger icon (3 rotating unfinished concentric rings), lives above
      every route via the root layout
- [x] Pressing the trigger expands it into a floating window anchored at
      that corner; a header h-line button collapses it back (both
      directions animate, with a reduced-motion opacity-only fallback)
- [x] Chat content: message list (user bubbles vs. flush assistant text),
      auto-growing composer, empty "Ask anything." state; sending only
      appends the user's own message — no fake AI reply yet
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
- [x] `Sidebar` holds `HistoryList` and `AgentRoster` behind a 2-tab
      switcher (History | Agents, one visible at a time, more tabs can
      join later) instead of stacking both — keeps scrolling sane in a
      narrow dock. Below ~480px of content width, the sidebar takes over
      the whole content area instead of splitting (phone-drawer
      behavior) — closing it is the only way back to the chat at that size
- [x] `HistoryList` switches between fake past sessions; `AgentRoster`
      lets you click an agent to open a dedicated session with it, or
      drag one onto the chat to add it alongside — shows an
      `ActiveAgentChip` + a muted system line, no fake agent reply
- [x] Typing `@` in the composer opens a picker filtered by what you type
      (click or Arrow keys + Enter/Tab to pick, Escape to dismiss);
      selecting an agent inserts `@AgentName` in the message. Sending a
      message with a mention renders it as a styled accent tag in the
      chat (like tagging a user in a normal chat app) and brings that
      agent into the conversation the same way dragging their roster
      card does

### To build (real functionality — not started)
- [ ] Real AI backend/model wiring (currently 100% static/local state)
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
      the separate data registry (id → label + `compute()`) each Widget's
      value comes from. `AnalyticsPanel`/`SidePanel` are fully transparent
      shells around a `StatSpace` — no panel-level box or heading.
      `AnalyticsPanel` wires one real statistic into one Slot, "Sessions
      this month" (counts real on-disk records for the current calendar
      month) — adding a new stat anywhere in the app means adding one
      registry entry + one Slot, not a new panel
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
      it, not sticky) holding filter chips — one today, a date-range
      filter. Its glass-pill chip opens a 3-column popup (presets column
      + two independent start/end calendars with day/month/year
      drill-down); UI-complete but not yet wired into what any statistic
      actually computes
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
      Widgets); wiring `DateRangeFilter`'s selected range into what each
      statistic's `compute()` actually returns — see
      `updates/2026-10-30 ANALYTICS - OPEN`

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
- [x] Knowledge: add files via a drop zone/file picker or a persistent
      "+ Add file" row, remove via a per-row button; fake size/type
      metadata per file; a context-usage meter (bar + %) against a fixed
      fake byte cap, clamped at 100% for display
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
- [ ] Real photo/file upload + storage (currently local object-URL
      previews and in-memory fake metadata only)
- [ ] Persistence across reloads — agents, edits, and version history are
      all in-memory state, reset on refresh
- [ ] Real AI behavior for a created agent (currently just a name/
      nickname/description/instructions/knowledge record with no model
      behind it)
- [ ] Wiring these agents into the AI Assistant's existing chat roster/
      @mention system (explicitly deferred — see this update's wiki.md)
- [ ] Auth (not started — no users yet)
