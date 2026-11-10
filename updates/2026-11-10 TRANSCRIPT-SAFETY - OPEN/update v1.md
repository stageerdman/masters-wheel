# Transcript rename safety + undo + toolbar — v1

## Goal
Renaming a transcript speaker (right-click → rename) could accidentally
merge two different real speakers into one if the typed name collided with
an existing different speaker — no warning, no way back. Add: a confirm
before a colliding rename goes through, one level of undo for it, and a
minimal toolbar on top of the transcript to reach both plus re-running
transcription from scratch.

## Phases

### Phase 1 — confirm, undo, toolbar
- [x] `Transcript.tsx`: `SpeakerContextMenu`'s submit handler now checks
      whether the typed name already belongs to a *different* existing
      speaker (`speakers.includes(name) && name !== from`); if so, awaits
      a native `confirm()` ("Merge "{from}" into the existing speaker
      "{name}"?") before calling `onRenameSpeaker` — an ordinary unique
      rename proceeds with no dialog.
- [x] `PerformanceReview.script.ts`: `renameTranscriptSpeaker` snapshots
      the pre-rename raw transcript text into a new
      `transcriptUndoSnapshot: Record<string, string>` (one level, not a
      stack — a second rename before undoing just overwrites the
      snapshot). New `undoTranscriptRename(id)` restores it, rewrites
      `transcript.md`, and clears that id's snapshot. Exposed as
      `canUndoTranscript`/`onUndoTranscript`, threaded the same depth
      every other Transcript-facing prop already takes
      (`PerformanceReview.tsx` → `Hero`/`Detail` → `TextView` →
      `Transcript`).
- [x] `Transcript.tsx` gains a small toolbar row above the line list,
      shown whenever a transcript exists: "↺" (undo — disabled when
      `canUndoTranscript` is false) and "⟳" (regenerate — confirm-guarded,
      "Regenerate the transcript? This discards the current one,
      including any renames.", then calls the already-existing
      `onRequestGenerate` → `openGenerateTranscript`, which already works
      directly off the record's own hero video). Plain glyph buttons, same
      convention as the rest of this element (no Phosphor here).
- [x] `tsc --noEmit`, `npm run lint`, `npm run build` all clean.

### Phase 2 — tracking + verification
- [x] `FEATURES.md` updated (Transcript section).
- [x] SSR sanity check via `curl` against a disposable `npm run dev`
      instance — `/performance-review` 200, no error overlay.
- [ ] **Not verified this session**: live click-through (the merge-confirm
      dialog actually appearing on a real collision, undo restoring the
      exact prior text, the regenerate-confirm guard) — no browser tool
      per CLAUDE.md's verification constraint. Please check this yourself.

## Decisions
- One level of undo, not a stack — matches what was actually asked for
  ("ideally some minimalistic buttons... return that step back") and
  avoids a bigger edit-history feature nothing else in this app has yet.
- Regenerating already silently discarded the current transcript before
  this round too (nothing warned you) — the new toolbar button is the
  first place that's reachable once a transcript already exists (today
  the only generate-trigger the Transcript element renders is in its own
  empty state), so it got a confirm guard at the same time it got
  surfaced here.
