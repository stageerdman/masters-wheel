# Update — Chat UX pass (formatting, agent picker, avatars)

## Goal
Four related upgrades to the `AIAssistant` chat, dictated together:
1. Chat messages render real markdown (bold/italics/lists/headings/code
   blocks/tables), matching Claude's own chat formatting.
2. Opening a **new, empty** chat shows an agent picker as the first thing
   in the chat column — clicking an agent starts a dedicated chat with
   them (today this only exists buried in the Sidebar's Agents tab).
3. `HistoryList` shows each past chat's agent photo, not just title/date.
4. Every place an agent appears in the chat (roster, picker, active chip)
   shows its real uploaded photo (already persisted, see
   `updates/2026-10-30 AGENTS-ENGINE - OPEN`) and a default description
   when none was written, instead of a bare initial letter / blank line.

## Scope note found during planning
There was no way to start a second new chat at all — the app creates
exactly one blank "New chat" session (`AIAssistant.script.ts`'s
`NEW_SESSION_ID = "current"`) at mount, and nothing in the Sidebar lets
you spawn another one once you've navigated away from it. A "New chat"
affordance is a prerequisite for item 2 to mean anything beyond the very
first time the window opens, so it's in scope here.

## Phased roadmap

**Phase 1 — Markdown rendering.**
`react-markdown` + `remark-gfm` render `ChatMessage.text`. A small custom
remark plugin re-splits text nodes on the existing `@AgentName` mention
regex so mention highlighting keeps working inside markdown (bold text,
list items, etc.), replacing the current plain-string `splitMentions`
approach. Code blocks get a monospace font — Geist Mono, added as a new,
deliberate `--font-family-mono` token (CLAUDE.md's "one font" rule is
about prose; distinguishing code from prose is the entire point of a code
block, same reasoning as why the category color palette is allowed to
exist alongside the core 5). No per-token syntax-highlighting colors —
that would need a many-color token budget (that's what highlight.js
themes are) which conflicts with the deliberate 5-color core palette;
code blocks get one bordered/background treatment from the existing
palette instead, structurally correct without new colors.

**Phase 2 — Shared `AgentAvatar` element + default description.**
New reusable element `src/elements/AgentAvatar` (photo `<img>` if
`photoUrl` is set, else the existing initial-letter badge) replaces the
ad hoc initial badge duplicated per call site. `src/lib/agents` gets a
`agentDescription(agent)` helper returning a default string when
`description` is blank. Wired into `AgentRosterItem` (which already read
`photoUrl` from the type but never rendered it) and `ActiveAgentChip`
(previously text-only).

**Phase 3 — New chat + agent picker.**
A "New chat" control creates a fresh draft session (no agent, no
messages) and switches to it, reusing one draft rather than piling up
empties. `AIAssistantWindow`'s chat column renders a new `AgentPicker`
child instead of `MessageList`/`Composer` whenever the active session is
that draft shape — "Who do you want to chat with?" + the real agent list
(`AgentAvatar` + name + `agentDescription`). Clicking one calls the
existing `selectAgent`, which already creates/opens a dedicated session.
Draft sessions with zero messages are filtered out of `HistoryList` so
they don't clutter history as fake "Now" entries.

**Phase 4 — History avatars.**
`agents` threaded into `HistoryList`/`HistoryListItem`; each row resolves
its session's primary agent (`session.agentId`, else first of
`activeAgentIds`) and renders its `AgentAvatar` next to title/date.

## Status: all 4 phases built
`tsc --noEmit`, `npm run lint`, and `npm run build` are all clean. Not yet
confirmed by the user's own click-through (browser automation is
off-limits for this project, per CLAUDE.md) — SSR HTML was spot-checked
via `curl` instead, which only confirms the app still mounts; it can't
exercise the open window, markdown rendering, or the new picker since
those only render client-side after the user opens the assistant.
