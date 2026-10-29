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
- [x] Analytics activation toggles a fake `AnalyticsPanel` (static numbers)
      in/out of the right panel with a pop-in/pop-out animation — doesn't
      navigate; activating it again while open closes it
- [x] Training / Chat with AI: listed, selectable, inert (no behavior
      dictated yet)
- [x] `NavMenu` items aren't text-selectable (they're controls, not
      reading content)
- [x] `AppHeader` wordmark is now a link home (`/`) and is brand-aware via
      `HeaderActionsContext` — shows "Master's Circle" by default, swaps to
      "Performance Review" + logo while that page is mounted; header is
      hidden entirely on Main Menu (`/`)

### To build (real functionality — not started)
- [ ] Training and Chat with AI behavior (not dictated yet)
- [ ] Real analytics data (currently static fake numbers)

## Performance Review page

### Built (UI shell only — no real functionality behind it)
- [x] App header (global orientation bar)
- [x] 3-column layout: Navigation / Hero / Detail
- [x] Navigation: search bar (client-side filter over fake list)
- [x] Navigation: scrollable video list, call-state icon (closed/training/
      postponed/failed, standalone colored glyph), date + title rows,
      description shown as a hover tooltip
- [x] Hero: title, static media placeholder, bookmark rail (Main text /
      Transcript / Notes / Core Lessons)
- [x] Hero: Main text (read-only fake text)
- [x] Hero: Transcript (fake lines, click is a no-op — no real video to seek)
- [x] Hero: Notes (locally editable, not persisted)
- [x] Hero: Core Lessons (locally editable, not persisted)
- [x] Hero: collapsible meta panel (3-dot toggle under the title) — offered
      amount + currency (typeahead combobox), 200-char description
- [x] Detail: draggable bookmark rail, reorderable, splits into two
      independent text panes when a bookmark crosses the line
- [x] Header: 3-area layout (logo / dynamic island / reserved), dynamic
      island shows the active call's state (clickable, changes it), plus an
      inert AI-reanalyze button and an inert "send to training ground"
      button

### To build (real functionality — not started)
- [ ] Real video/audio upload + storage
- [ ] Real media playback (currently a static placeholder)
- [ ] Real transcription generation
- [ ] Transcript lines actually seeking the video
- [ ] AI analysis of the call/session (currently no content type for this at
      all — needs its own bookmark + content type; the header's AI button is
      currently a no-op placeholder)
- [ ] AI-assisted core lesson extraction (currently just a free-text field)
- [ ] "Take it to the training ground" button (currently a no-op placeholder
      — behavior not yet dictated)
- [ ] Notes/Core Lessons/state/offered-amount/description persistence
      (currently local component state, lost on refresh)
- [ ] Backend data model + storage for videos/notes/lessons/transcripts
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
