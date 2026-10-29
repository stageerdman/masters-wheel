# Wiki — Agents

## Why this doesn't reuse the AI Assistant's existing `Agent` type
`AIAssistant.script.ts` already has an `Agent` (id/name/tagline/initial)
used for chat @mentions and the sidebar roster. Explicitly confirmed with
the user before starting: the new "create your own agent" feature does
not need to be the same data right now. Keeping them separate avoids a
risky refactor of already-shipped AI Assistant behavior for a feature
whose own requirements (photo, nickname, instructions, knowledge files,
versions) are much richer than the chat roster needs. Revisit a merge
only if a future update explicitly asks these to be the same agents.

## Why the mention picker moved to `src/lib/`
`findActiveMention`/`useMentionPicker` (originally private to the AI
Assistant's `Composer`) only ever touch their generic list through a
`.name` field — nothing in the hook is actually chat-specific. Once a
second, unrelated feature (Instructions' @-file-mentions) needed the same
state machine, CLAUDE.md's own rule — add a shared module once the project
*genuinely* grows into needing one, not speculatively — was satisfied.
Generalized over `{ name: string }` with an optional match predicate
(agents keep `startsWith`; knowledge files use substring, since filenames
are recalled by any distinctive word, not just the first letters).

## Why Version History is a push-split panel, not a modal
The whole point of browsing versions is comparing a past snapshot against
the live editor content next to it (especially long fields like
Instructions). A modal would cover the exact content being compared
against. The AI Assistant's `Sidebar` already establishes this codebase's
only "side panel" precedent (flex-width push, not an overlay) — reused
directly rather than inventing a second pattern for the same shape of
problem, scaled up in width and with its own narrow-container drawer
breakpoint since this is a full page, not a small docked window.

## Why Save is a hard wall for undo/redo
The dictated requirement itself scopes Cmd+Z to "before ever pressing
Save" — read as the spec itself drawing the boundary. Splitting it this
way keeps each mechanism's job unambiguous: Cmd+Z undoes *this session's*
uncommitted edits; Version History is how you undo *committed* (saved)
history. A stack that survived Save would let Cmd+Z silently reach back
through already-saved states with no visible list, fighting the Save
button's own dirty-state signal. Restoring an old version still counts as
one undo-able commit, so a restore (even though it's protected by a
confirm dialog when there are unsaved edits to lose) has a cheap, instant
undo path too.

## Commit granularity: blur, not keystroke
The app-level undo stack commits text fields on blur (only if the value
actually changed since focus), and lets the browser's native per-field
undo run untouched while a field is focused. Non-text actions (photo
swap, knowledge file add/remove) commit immediately since there's no
native undo competing for them. The global Cmd+Z/Cmd+Shift+Z listener
only intercepts when focus is outside any text-editable control — this is
what keeps native textarea undo and the app-level cross-field stack from
fighting over the same shortcut.

## Known v1 simplification: mention-picker anchoring
The UX spec for Instructions recommended caret-mirroring (anchoring the
file-mention dropdown to the exact cursor position within a tall,
multi-line textarea). v1 anchors it to the textarea's own edge instead,
the same way the AI Assistant's single-line Composer does — simpler, and
the dropdown already narrows to the right match within a couple of
characters so the extra precision matters less in practice. Flagged here
rather than silently dropped, in case a future pass wants the fuller
version.
