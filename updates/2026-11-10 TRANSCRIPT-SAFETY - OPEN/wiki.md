# Transcript rename safety — wiki

## Bug found via real use: `claude -p <message>` breaks on a message starting with `-`
Reported after shipping real Scorecard generation: every attempt failed
with `error: unknown option '---...'`. Reproduced empirically in an
isolated harness (not guessed) by calling the exact resolved binary
(`/opt/homebrew/bin/claude`) with the exact flag order `run_claude` used:

```
claude -p '---
generated_at: ...
---

**Speaker** [00:00]
...' --output-format json --system-prompt "..." --permission-mode dontAsk --tools ""
```

→ `error: unknown option '---...'`. This app's transcripts always
serialize starting with `---` (the frontmatter delimiter —
`serializeTranscript` in `src/lib/transcript/index.ts`), so Scorecard
generation hit this on literally every real transcript, not an edge case.

Root cause: `-p`/`--print` takes **no value of its own** — the prompt is
a separate positional argument. Passing it immediately after `-p` as
`.arg("-p").arg(message)` still works for an ordinary message, but once
the message's first token looks like an option (starts with `-`), the
CLI's own arg parser treats it as an unrecognized flag instead of the
positional prompt — regardless of how many real flags come after it.

Confirmed fix empirically before applying it: moving every real flag
*before* `-p`, then `-p -- <message>` *last*, with nothing after it —
`--` tells the parser "everything after this is positional," but only if
it's genuinely the last thing before the prompt (an earlier manual test
placing `--` right after `-p` but before the *other* flags caused the
CLI to treat those other flags as positional text too, silently ignoring
`--output-format json` and printing plain text instead of a parseable
JSON wrapper — so `--` can't just go anywhere, it has to be immediately
before the final positional argument with nothing real after it).

Applied to all three local-`claude`-CLI call sites that pass a message
this way: `claude_cli.rs`'s `run_claude` (shared by Scorecard generation
and every `roleplay.rs` command), and `assistant.rs`'s `ask_agent` and
`name_chat` (the AI Assistant chat path) — the same bug was latent there
too; a user typing a chat message starting with `-` would have hit it,
it just hadn't surfaced yet since chat messages don't reliably start with
`-` the way this app's transcripts always do.

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
