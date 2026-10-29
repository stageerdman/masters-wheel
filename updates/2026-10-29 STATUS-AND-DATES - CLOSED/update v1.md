# Update v1 — Status/date editing polish (CLOSED)

Small, fast-turnaround follow-up to Local Records Backend — all dictated
and shipped in one sitting, no multi-phase roadmap needed.

## Spec, as dictated
- New call state: "Not Qualified" — red minus-sign glyph.
- Hovering a status option in the header dropdown shows an explanation
  of what that status means.
- Remove the placeholder "○" dot shown for an unclassified record's
  status — it read as a real (confusing) icon, not emptiness.
- Meta panel: meeting date becomes editable (it's the actual meeting
  date, not when the record was added to the app).
- New "closed date" field: auto-fills when state is changed to "closed",
  stays manually editable afterward.
- Hero title becomes click-to-edit inline.

## What shipped
- `CallState`/`CALL_STATE_META` gained `"notQualified"` (glyph `−`,
  `--color-status-not-qualified` — a genuinely new category, not a reuse
  of `failed`'s red) and a `description` field on every state, used as
  each dropdown option's `title` tooltip.
- `StateMenu`'s `UNSET` fallback glyph changed from `"○"` to `""` — the
  button stays clickable (so a first classification is still reachable)
  but shows nothing instead of a stray dot.
- `RecordMetaFields`/`VideoRecord` gained `closedDate: string | null`,
  persisted the same way as every other meta field.
- `PerformanceReview`'s `onStateChange` now also sets `closedDate` to
  today the moment `state` becomes `"closed"`, but only if `closedDate`
  isn't already set — never clobbers a manually-entered date.
- `MetaPanel` gained two `<input type="date">` fields (Meeting date,
  Closed date) next to the existing offered-amount/description fields.
- Hero's title is an `<h1>` until clicked, then an autofocused `<input>`
  bound straight to the same `updateMetaField("title", ...)` path as
  everything else; blurring or Enter/Escape exits edit mode.

## Bug fixed along the way
`scheduleMetaWrite` keyed its debounce timer by record id only, so two
`updateMetaField` calls in the same tick (exactly what `state` +
`closedDate` do) would cancel-and-replace each other's pending write —
the first field's change would never reach disk. Fixed by merging into a
per-id pending-partial accumulator instead of replacing it outright. See
`src/elements/PerformanceReview/PerformanceReview.script.ts`.

## Rebuilt
`npm run app:build` + reinstalled to `/Applications/Master's Circle.app`
per the standing "always rebuild" rule.
