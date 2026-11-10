# Settings redesign — wiki

## A themed photo background needs no new palette
The `--discipline-*` precedent (TrainingRoom's DisciplinePicker) is for a
bespoke *gradient* world with its own hand-picked gold/parchment hues —
that's what justifies a whole new CSS-variable set exempt from the core-5
budget. Settings' Hogwarts background is a real photo, and the UI sitting
on top of it is still this app's own chrome (rows, text, icons) — so
"bluish rows" and "translucent expand panels" are built entirely from
`color-mix()` on `--color-accent` (already blue, `#2563eb`) and the
existing `--color-glass-*`/`--glass-blur` tokens, with zero new variables.
Only introduce a dedicated palette the day Settings itself becomes a fully
committed alternate visual world (like Discipline Picker is), not just a
page with a nice photo behind it.

## Stacking order: positioned z-index:0 backgrounds paint after static siblings
`next/image`'s `fill` prop makes the background element `position:
absolute`, which (per CSS painting order) paints *after* ordinary
non-positioned in-flow siblings within the same stacking context — not
before. A sibling left as plain `position: static` would get painted
*underneath* a `z-index: 0` positioned background despite coming later in
the DOM. `MainMenu` already solves this by giving its `.content` wrapper
`position: relative; z-index: 1` explicitly; `Settings.position.module.css`
and `SettingsSidebar.position.module.css` both do the same so the sidebar
and panels reliably paint above `BackgroundImage`.

## Dynamic scoring criteria live in Settings, not Scorecard
`ScorecardCriterionDef` (id/name/prompt) is defined in `src/lib/settings`,
not `src/lib/scorecard` — Settings owns *what* gets scored (user-editable,
per-Space config), Scorecard owns *the rating scale and the generated
result* (fixed 0-4 rubric, persisted per-record). `ScorecardCriterionId`
is now just `string`, an opaque id into that settings list — see
`updates/2026-11-02 SCORECARD - OPEN/update v2.md`'s Phase 1 for the full
migration (why ids are stable/never name-derived, how the original 11 seed
exactly so existing `scorecard.json` files keep resolving).

## PromptRow is deliberately separate from ScoreRow
Both are "a row that expands into a translucent edit panel," but
`PromptRow`'s left side is a fixed label while `ScoreRow`'s left side is
itself an editable field, plus `ScoreRow` carries an ordinal + delete
affordance `PromptRow` has no use for. Forcing one shared component this
early (only one real usage of each shape) would be speculative
abstraction — see CLAUDE.md's "don't add abstraction on speculation" and
this project's own generalize-on-second-consumer convention. Revisit only
if a second `ScoreRow`-shaped consumer actually shows up.
