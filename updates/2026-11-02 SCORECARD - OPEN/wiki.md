# Scorecard — wiki

## v2: criteria moved to Settings, not owned here anymore
As of v2, the 11 criteria below are no longer fixed in this module — they
became a user-editable per-Space list owned by `src/lib/settings`
(`ScorecardCriterionDef`). See `update v2.md`'s Phase 1 and
`updates/2026-11-10 SETTINGS-REDESIGN - OPEN/wiki.md` for the full
reasoning (why ids are stable/never name-derived, how the original 11 seed
so old `scorecard.json` files keep resolving). This module still owns the
rating scale (0-4) and the generated/persisted `Scorecard` shape.

## Why a 5th bookmark kind, not a separate panel
AI / Transcript / Notes / Core Lessons were already exactly this shape: one
`ContentKind`, switched via `BookmarkRail`/`SplitRail`, rendered by the
shared `TextView`. Scorecard is "another thing to look at about this call,"
same category as those four — bolting on a separate standalone panel would
duplicate the whole rail/split/active-selection machinery for no reason.

## Rating colors are category-exempt, not core-5
Per CLAUDE.md, a rating level (Skipped/Poor/Good/Great/Outstanding) *is* a
visual identity for a distinct category, same reasoning as call-state and
bookmark colors — collapsing them into the core palette would destroy the
distinction the color exists to draw. 5 new category tokens
(`--color-rating-*`), not a 6th-core-color violation.

## "Legendary" Outstanding look without a new hue
The glow/shimmer on Outstanding is built entirely from
`color-mix(in srgb, var(--color-rating-outstanding) X%, ...)` — the same
exemption precedent `--color-glass-border`/`--color-glass-sheen` already
use (derived views of an existing variable, not a genuinely new color).

## Fake generation, real persistence
Per direct user decision: "Generate Scorecard" fabricates a plausible
result locally (no real AI call this round — matches the AI-analysis/
lesson-extraction/transcription deferral pattern already established on
this page) but the result is written to a real `scorecard.json` per record,
not kept in-memory-only. Future real-AI work replaces just the generator
function; the persistence/UI layers don't change.

## Hover descriptions use the native `title` attribute
`StateMenu` already does exactly this (`title={option.description}`) for
its own hover explanations — reused rather than building a custom tooltip
component for the same job.
