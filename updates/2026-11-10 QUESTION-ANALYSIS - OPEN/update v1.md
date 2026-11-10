# Question Analysis — v1

## Goal

Replace Performance Review's dead "AI analysis" bookmark (a freeform
textarea nothing ever populated) with a real feature: on demand, extract
every question the salesperson asked on a call and a clean outcome for its
answer, from the real transcript. Persist it, show it as its own card, and
expose it over MCP so an agent can search/read it.

## Phases

### Phase 1 — Backend: cheap-model plumbing + MCP document swap
- `src-tauri/src/claude_cli.rs`: optional `model`/`effort` pass-through on
  `run_claude`/`run_claude_once`, `None` for every existing caller.
- `get_performance_review.rs`: drop the `analysis` document (`ai_analysis.md`),
  add `questions` (`question_analysis.json`, returned whole — small bounded
  list, no char pagination needed).
- `search_performance_reviews.rs`: drop analysis search, add a
  question/answer-flattened search pass.
- `server.rs`: update the three tool descriptions that named "AI analysis".

Status: done.

### Phase 2 — Frontend lib: types, generation, persistence
- New `src/lib/questionAnalysis/` (`index.ts` types, `generate.ts` —
  prompt + labeled-line parser + `run_claude_once` call with
  `model: "haiku", effort: "low"`).
- `src/lib/records/index.ts`: collapse the now-single-kind `DocKind`
  generic into direct `readNotes`/`writeNotes`; add
  `readQuestionAnalysis`/`writeQuestionAnalysis`/`parseQuestionAnalysis`
  mirroring the scorecard read/write/parse trio.

Status: done.

### Phase 3 — UI: element + wiring
- New `src/elements/QuestionAnalysis/` (+ `children/QuestionRow/`),
  mirroring `Scorecard`'s empty/generating/error/result states.
- `PerformanceReview.data.ts`: `ContentKind` `"ai"` → `"questions"`;
  `VideoRecord.aiAnalysis` → `questionAnalysis`.
- New `--color-bookmark-questions` token (kept `--color-bookmark-ai`
  as-is — it's still load-bearing for Training Room's unrelated "AI
  trainer" chat bubble color, see wiki.md).
- `TextView`/`Hero`/`Detail`/`PerformanceReview.script.ts`/
  `PerformanceReview.tsx`: swapped `aiAnalysis`/`onAiAnalysisChange`
  threading for `questionAnalysis`/`isGeneratingQuestionAnalysis`/
  `onGenerateQuestionAnalysis`/`questionAnalysisError`, same shape as the
  existing scorecard threading.

Status: done.

### Phase 4 — Docs + verification
- `FEATURES.md`: Performance Review section updated (bookmark rail
  listing, the three stale "AI analysis" MCP-tool-description mentions,
  the dead "To build: Real AI analysis generation" bullet removed, a new
  real-functionality bullet added for Question Analysis).
- `npm run lint`, `npx tsc --noEmit`, `cargo check` — all clean.
- No automated tests added (matches this app's "test what matters" bar —
  the labeled-line parser here is a near-identical copy of Scorecard's
  already-untested parser; same risk profile).
- Live click-through **not verified** — this project's standing
  constraint rules out the browser tool and dev-server restarts. Needs a
  manual check by the user: open a record with a transcript, click
  "Generate Question Analysis", confirm the extracted list renders and
  timestamps seek the video.

Status: done. App rebuilt (`npm run app:build`) and reinstalled to
`/Applications` after every code change in this phase, including the two
follow-ups below.

### Phase 5 — Two follow-up tweaks (post-initial-build)
- Prompt now explicitly requires the extracted QUESTION/ANSWER text to
  stay in whatever language the transcript itself is in (never translate
  to English, even though the instructions themselves are in English;
  match language per-question if a call switches languages mid-way).
- Card header now shows a live "`N question(s)`" total next to the
  "Question Analysis" title once a result exists (`QuestionAnalysis.tsx`
  `data.pairs.length`).

Status: done.

## Still open / next session

- **Not yet verified live** by the user — the one remaining item from
  Phase 4. Open a record with a transcript in Performance Review, click
  "Generate Question Analysis," and confirm: the list renders, each
  question/answer reads clean, timestamps seek the real video, and
  (for a non-English call) the extracted text actually stayed in the
  transcript's own language rather than being translated.
- No other known follow-ups. If the live check surfaces a parsing/format
  issue, the fix almost certainly belongs in
  `src/lib/questionAnalysis/generate.ts`'s prompt or
  `parseQuestionAnalysisReply`, mirroring how Scorecard's own parser was
  hardened — see that file's doc comment.
