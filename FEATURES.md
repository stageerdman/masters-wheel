# Features

Running tracker: what's built (as UI shell — fake data, no backend) vs. what
still needs to be dictated and built. Update this whenever a feature moves
between the two lists. Each page gets its own section as pages get added.

## Main Menu page

### Built (UI shell only — no real functionality behind it)
- [x] `MainMenu` at `/`: wallpaper background, left `NavMenu` (4 items:
      Performance Review, Analytics, Training, Chat with AI), right
      `SidePanel` (empty until Analytics is activated)
- [x] `NavMenu`: arrow-key highlight + Enter activates; mouse hover
      highlights, click activates (same effect as keyboard); highlighted
      item shows an arrow marker
- [x] Performance Review activation navigates to `/performance-review`
- [x] Analytics activation shows a fake `AnalyticsPanel` (static numbers) in
      the right panel — doesn't navigate
- [x] Training / Chat with AI: listed, selectable, inert (no behavior
      dictated yet)
- [x] `AppHeader` wordmark is now a link home (`/`) and is brand-aware via
      `HeaderActionsContext` — shows "Master's Circle" by default, swaps to
      "Performance Review" + logo while that page is mounted

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
