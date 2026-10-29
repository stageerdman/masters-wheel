# Update v2 — Reviewed flag + open count (CLOSED)

Same-sitting follow-up to v1.

## Spec, as dictated
- Header gets a check button next to the "send to training ground"
  sword button: toggles whether the user has personally reviewed this
  call.
- Track how many times each record has been opened (no UI yet — "will
  be helpful later").
- A reviewed record gets a subtle green highlight in the Navigation
  list.

## What shipped
- `RecordMetaFields`/`VideoRecord` gained `reviewed: boolean` and
  `openCount: number`, both persisted to `meta.json` like every other
  field.
- `ActionIsland` gained a `✓` toggle button (muted when off,
  `--color-reviewed` green when on) next to the sword button.
- `HeaderIsland` context extended with `reviewed`/`onToggleReviewed` so
  `PerformanceReview` can drive it without `AppHeader` reaching into
  page state directly (same pattern as `stateOptions`/`onStateChange`).
- `usePerformanceReviewData` tracks `openCount`: an effect keyed on
  `selectedId` increments the newly-selected record's count once per
  actual selection change (including the initial auto-select on load),
  deferred a tick via `Promise.resolve().then(...)` — same pattern the
  existing initial-load effect already used — to satisfy the
  `set-state-in-effect` lint rule.
- `VideoListItem` gets a `.reviewed` modifier: `box-shadow: inset 3px 0
  0 0 var(--color-reviewed)`, a left-edge accent rather than a
  background tint, so it stays visible under the hover/active states
  that already use `background`.
- New category color `--color-reviewed` (`#2e7d32`) — same hue as
  `--color-status-closed` but a separate named variable, since "I
  reviewed this" and "the call closed" are different categories that
  happen to share a color family.

## Rebuilt
`npm run app:build` + reinstalled to `/Applications/Master's Circle.app`.
