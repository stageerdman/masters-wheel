# Transcript rename safety — wiki

## The collision check belongs in `Transcript.tsx`, not the script hook
`PerformanceReview.script.ts`'s `renameTranscriptSpeaker` already has
everything needed to detect a same-name collision (it re-parses the
transcript), but `Transcript.tsx` already computes `speakers` via
`speakersOf` for color-coding every render — checking there avoids a
second parse and keeps the "ask before merging" decision next to the UI
that's showing the dialog, not buried in a data hook.

## "Regenerate transcript" already existed — it just wasn't reachable
`onRequestGenerate` → `PerformanceReview.script.ts`'s `openGenerateTranscript`
already resolves the record's hero video and opens `GenerateTranscriptModal`
with no extra wiring needed. The only gap was that `Transcript.tsx` only
rendered that trigger inside its own empty state (`TranscriptEmptyState`)
— once a transcript exists there was no button left pointing at it at all.
The toolbar's "⟳" is the exact same callback, just newly exposed once a
transcript already exists, with a confirm guard added at the same time
since now it has somewhere to actually be clicked from.

## Why one level of undo, not a history stack
Matches the literal ask ("ideally some minimalistic buttons... return that
step back") rather than building a general edit-history feature nothing
else in this app has. A second rename before the first is undone simply
overwrites the snapshot — acceptable since the alternative (a real stack)
is a much bigger feature for a problem ("I accidentally typed the wrong
name") that in practice only needs going back one step.
