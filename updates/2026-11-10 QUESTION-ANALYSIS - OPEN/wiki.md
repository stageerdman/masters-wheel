# Question Analysis — wiki

## Extraction stays in the transcript's own language

The model has no explicit instruction otherwise defaults toward English
output even from a non-English transcript. Since this app's transcripts
are routinely non-English (see claude_cli.rs's own note re: Czech
diacritics), the prompt now explicitly forbids translating — the
QUESTION/ANSWER text must match whatever language the transcript itself
used, per-question if a call switches languages mid-way. Added directly
to `buildQuestionAnalysisPrompt` in `src/lib/questionAnalysis/generate.ts`
rather than as a separate flag/toggle — there's no legitimate case where
translating would be wanted here.

## Reused Scorecard's architecture wholesale

Question Analysis isn't a new pattern — it's Scorecard's exact shape
(own `ContentKind`, own generate button/loading/error state in the hook,
own JSON file on disk, own element under `src/elements/`) applied to a
different extraction job. Deviating from that shape anywhere would have
made the two generate-style cards behave inconsistently for no reason.

## Cheap model, confirmed empirically before committing to it

The user explicitly asked for a cheap/simple model for this job (it's
mechanical extraction, not a judgment call like scoring criteria).
Rather than trust `claude --help`'s model-alias examples (`fable`,
`opus`, `sonnet` — `haiku` wasn't even listed), ran it for real:

```
claude --model haiku --effort low --output-format json \
  --system-prompt "Reply with exactly: OK" --permission-mode dontAsk \
  --tools "" -p -- "ping"
```

Confirmed `haiku` resolves to `claude-haiku-4-5-20251001`, costs
~$0.0009 for a trivial call, and the combination with the existing
`--output-format json`/`--permission-mode dontAsk`/`--tools ""` flags
`claude_cli.rs` already sends works without conflict. `run_claude`/
`run_claude_once` got optional `model`/`effort` params (default `None`)
rather than a hardcoded flag, so Scorecard/roleplay stay on the default
session model untouched and any future cheap-model caller can reuse the
same plumbing.

## Old "AI analysis" removed outright, not deprecated-in-place

Confirmed with the user before touching anything backend-side: the old
`aiAnalysis`/`ai_analysis.md`/MCP `analysis` document was always dead —
nothing had ever written to it (FEATURES.md said so explicitly). Per
this app's convention (delete unused code rather than leave it half-
removed), it's gone — field, file handling, MCP document, and every
"notes/transcript/analysis" mention in tool descriptions and this app's
own docs — not just hidden from the bookmark rail.

## `--color-bookmark-ai` stayed; a new token was added instead

First instinct was to rename `--color-bookmark-ai` to
`--color-bookmark-questions` since the old "AI" bookmark slot was being
replaced. Wrong — that variable is also the color Training Room's AI
Trainer chat bubbles use (`RoleplayChat.styles.module.css`), a
completely unrelated "AI" identity. Renaming it would have silently
recolored Training Room. Added a genuinely new category token
(`--color-bookmark-questions: #7c3aed`, violet — distinct from the
existing gray/blue/amber/teal/pink bookmark hues) instead, per this
project's styling rule: a new category color is for a genuinely new
category, never a substitute edit to an existing one still in use
elsewhere.

## Toast-gate, not a disabled button, for "no transcript yet"

Scorecard's existing convention: the Generate button is never disabled;
clicking it with no transcript shows a native `message()` info dialog
and bails. Question Analysis copies this exactly (same guard shape in
`generateQuestionAnalysis`, same dialog wording pattern) rather than
introducing a second, inconsistent "missing prerequisite" UI convention.

## No header quick-action button

Scorecard has both an in-card Generate button and a header-island "SC"
shortcut. Question Analysis deliberately only gets the in-card button —
the user asked for a button on the card itself, and adding a second
header affordance wasn't requested; keeping the header unchanged avoids
scope creep and keeps the header from accumulating one icon per
generate-style card.
