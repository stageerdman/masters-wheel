# Settings redesign — v1

## Goal
Replace the single unstyled Settings textarea with a real Settings page:
a Hogwarts-Legacy-themed full-bleed background, a left icon sidebar with 2
categories (Profile, Score), and each category's settings as collapsible
rows. The Score category turns the Scorecard's 11 criteria from hardcoded
constants into a user-editable per-Space list — "Score 1", "Score 2", ...
each with an editable name (left side of the row) and an editable
prompt/definition (inside the row's dropdown); filling one in auto-appends
the next blank row. Dictated as the prerequisite for the Scorecard
row-expand work in `updates/2026-11-02 SCORECARD - OPEN/update v2.md`
(dynamic criteria had to exist before that UI could consume them) — see
that update's own Phase 1 for the data-model half of this change.

## Phases

### Phase 1 — data model (tracked in SCORECARD's own update, not here)
`scorecardCriteria` (id/name/prompt per criterion) lives in
`src/lib/settings`, not this update's own files — see
`updates/2026-11-02 SCORECARD - OPEN/update v2.md`'s Phase 1 for the full
write-up (seeding, parsing, generator/records changes).

### Phase 2 — Settings visual shell
- [x] `public/settings-background.webp` — the dictated Hogwarts Legacy
      image, copied in (not moved — the original Downloads copy was left
      alone).
- [x] `src/elements/Settings/children/BackgroundImage`: same mechanism as
      `MainMenu/children/BackgroundImage` (`next/image` `fill` +
      `object-fit: cover`), just a different source image.
- [x] `src/elements/Settings/children/SettingsSidebar`: 2-icon
      `role="radiogroup"` rail (Profile = Phosphor `UserCircle`, Score =
      Phosphor `ChartBar`, duotone) — same `aria-checked` + accent
      border/tint-on-selected pattern `CreateSpaceModal`'s icon grid
      already uses.
- [x] `src/elements/PromptRow` (reusable, flat under `src/elements/` since
      the shape isn't Settings-specific): collapsed row shows just the
      setting's name; click drops a translucent panel with the editable
      textarea. `src/elements/Settings/children/ProfilePanel` wraps the
      existing `businessDescription` field in one of these.
- [x] `src/elements/Settings/children/ScorePanel` +
      `children/ScoreRow`: "Score N" + inline-editable name on the left;
      click (row, not the name input) expands the same translucent-panel
      style to edit the prompt. `ScorePanel` keeps exactly one trailing
      blank row at all times (`ensureTrailingBlank`) and supports deleting
      any non-trailing-blank row.
- [x] Only one row open at a time, lifted `expandedId` state — same rule
      the Scorecard rows will also use once Phase 3 of the Scorecard
      update lands.
- [x] `Settings.tsx` rebuilt as the shell: background + sidebar + active
      panel, 2 independent debounce timers (business description, scoring
      criteria) over the same `writeSettings` merge-write already used.

### Phase 3 — Tracking + verification
- [x] `FEATURES.md` updated (Settings page section).
- [x] `npm run build`, `npm run lint`, `tsc --noEmit` all clean.
- [x] SSR sanity check via `curl` against a disposable `npm run dev`
      instance (none was already running) — `/settings` and
      `/performance-review` both 200, no error overlay. Stopped that
      disposable server afterward.
- [ ] **Not verified this session**: live click-through (sidebar category
      switch, row expand/collapse, auto-appending blank Score rows,
      background image actually rendering, deleting a row) — no browser
      tool per CLAUDE.md's verification constraint. Please check this
      yourself in the real app.

## Decisions
- No new CSS variables — "bluish" rows reuse `--color-accent` (already
  blue) via `color-mix()`; translucent panels reuse the existing
  `--color-glass-*`/`--glass-blur` exemption precedent. See wiki.md.
- Deletion wasn't explicitly requested but was included as a minimal
  necessary affordance (every row except the perpetual trailing blank one
  can be deleted) — without it a mistaken Score entry could never be
  corrected.
