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

## Status: all 4 phases built, plus a follow-up UX pass
`tsc --noEmit`, `npm run lint`, and `npm run build` are all clean. Not yet
confirmed by the user's own click-through (browser automation is
off-limits for this project, per CLAUDE.md) — SSR HTML was spot-checked
via `curl` instead, which only confirms the app still mounts; it can't
exercise the open window, markdown rendering, or the new picker since
those only render client-side after the user opens the assistant.

### Follow-up pass — responsive fix, sidebar redesign, per-agent identity
Dictated after trying the first pass live:
- **Responsive bug, root-caused rather than patched per-symptom.**
  `AIAssistantWindow`'s `.chatColumn` is a `flex: 1` row child with no
  `min-width: 0` — the real cause of text getting clipped instead of
  wrapping at narrow dock widths: without it, a flex item won't shrink
  below its content's intrinsic width, so it overflows past the
  window's own fixed, `overflow: hidden` width instead of wrapping.
  Fixed there, plus removed a `white-space: nowrap` + ellipsis on
  `AgentRosterItem`'s description (now a 2-line clamp) which was adding
  to the same intrinsic-width problem.
- **Sidebar: tab switcher dropped.** `AgentStrip` (icon + name, horizontal
  scroll, ordered by recency) now sits above a standardized small
  "History" label and `HistoryList` — replacing the old History/Agents
  2-tab switcher entirely. Clicking an agent in the strip opens a
  dedicated chat immediately, same as the old Agents tab's roster did.
  `AgentRosterItem` moved out from under the now-deleted `AgentRoster`
  wrapper to a flat sibling spot (`AgentPicker` is its only remaining
  user).
- **Recency tracking.** `sessions` is kept in "most recently used first"
  order (`bringSessionToFront`, called on sending a message or
  starting/resuming an agent's dedicated chat — deliberately not on
  every passive history click, so browsing the list doesn't reshuffle
  it). `orderAgentsByRecency` derives `AgentStrip`'s order from that for
  free; unused agents fall back to roster order at the end.
- **Draft sessions, now an explicit flag.** `isDraftSession` used to
  infer "draft" from shape (no agent, no messages) — that collided with
  `HISTORY_FIXTURES`'s `hist-3`, a legitimately-empty fixture with the
  same shape, silently vanishing from history. Now `ChatSession.isDraft`
  is set once at creation and never inferred.
- **History delete.** Right-click → the existing shared `ContextMenu`
  element → "Delete chat" (native `confirm()` first). Found a real bug
  applying `ContextMenu` inside this window: it renders with
  `position: fixed`, but `AIAssistantWindow`'s root always has a CSS
  `transform` (every dock state sets one) — which makes the window itself
  the fixed-positioning containing block, so the menu would have clipped
  to the window's own bounds instead of the viewport. Fixed by having
  `ContextMenu` portal to `document.body` (a general fix, not special-
  cased — doesn't change its existing Performance Review usage, which
  never had a transformed ancestor to begin with).
- **Composer placeholder** simplified to "Message…" (dropped the "type @
  to bring in an agent" hint).
- **Per-agent identity throughout the conversation**, not just at the
  very start: a dedicated chat's empty state is that agent's profile
  (photo/name/description) instead of "Ask anything.", and every
  assistant reply carries a small avatar + name label
  (`AIAssistantWindow` resolves one `respondingAgent` per session via the
  now-exported `resolveActiveAgents`, passed down through
  `MessageList`/`Message`).

### Follow-up pass — glass material ("Dock" concept)
Explored as a separate HTML artifact first (3 throwaway rounds — the
first two tried real glass refraction via SVG `feTurbulence` +
`feDisplacementMap` on `backdrop-filter`; that combination isn't
reliably supported as one value in most engines, and when rejected it
silently dropped the *whole* `backdrop-filter` declaration, blur
included, then a heavier version of the same idea made the page
unresponsive — dropped entirely for a `box-shadow`-only edge fringe,
which the user ended up tuning to 0 anyway). Landed on "Dock": blur 4px,
tint 0%, edge 0% (off), border 6%, sheen 10%.

Implemented for real: `globals.css` gets a small "Glass surface" token
group (`--glass-blur`, `--color-glass-border`, `--color-glass-sheen`) —
both colors derived from the existing core palette via `color-mix`
(`--color-text` and white), not a 6th hue, same reasoning
`--color-on-chip` is already exempt. `AIAssistantWindow`'s `.root` is the
one actual glass surface (transparent background + `backdrop-filter:
blur(4px)` + the new hairline border + a `::after` diagonal sheen);
`Sidebar`/`Composer`/`.chatColumn`/the composer's own input field all
drop their opaque `--color-surface` fill so the window's single blur
shows through consistently instead of being painted over — deliberately
only *one* backdrop-filter region (the window itself), not one per
sub-panel, for performance. Internal dividers (header/sidebar/composer
border lines) stay on the plain `--color-border` token, unchanged — the
new glass-border is for the window's own outer edge specifically, not
every internal hairline.

### Follow-up pass — real-app bugs after trying it live
Three things surfaced trying the shipped glass window:
1. **History/the message area still looked opaque (black in dark mode).**
   Missed two nested opaque fills on the first pass:
   `MessageList.styles.module.css` and `HistoryList.styles.module.css`
   each had their own `background: var(--color-surface)` on `.root`,
   covering the *entire* scrollable area and completely hiding the
   window's blur behind them — in dark mode that's `#0a0a0a`, which
   reads as plain black. Both dropped to `background: none`, same as
   Sidebar/Composer/chatColumn before them.
2. **Blur bumped from 4px to 8px** per request, once seen for real.
3. **The packaged app crashed ("This page couldn't load") the moment a
   chat actually started streaming a reply in.** Likely cause: `.root`
   (the floating window) carried both `backdrop-filter` *and* continuous
   CSS transitions on `transform`/`width`/`height`/`opacity` (drag/dock/
   resize), plus `overflow: hidden` and a `::after` pseudo-element — all
   on the same element. That specific combination (backdrop-filter +
   animated transform/opacity + overflow:hidden + a pseudo-element) is a
   known WebKit compositing crash class; StatWidget's own
   `backdrop-filter` ships fine elsewhere in this same app precisely
   because it's never the subject of a *continuous* transform/opacity
   transition the way this window is. Fixed by moving the entire glass
   treatment (background/backdrop-filter/border/box-shadow/sheen) onto a
   new static, non-animated child — `.glassShell`, sized to fill `.root`
   exactly — so nothing with `backdrop-filter` is ever also the thing
   being dragged/resized. Not independently confirmed via a crash log
   (no tooling here to attach to the packaged app's WKWebView) — this is
   the most plausible fix grounded in known WebKit behavior, pending the
   user's own retest.

### Correction — the crash was never CSS
The `.glassShell` restructure above didn't fix it, because the crash had
nothing to do with WebKit/backdrop-filter at all — it reproduced in the
plain dev-server browser tab too, with a real stack trace: `Message.tsx`
passed `remarkMentions(agents)` (already the *transformer* function,
`(tree) => void`) directly into `remarkPlugins`. Unified calls each
`remarkPlugins` entry as the *attacher* at plugin-attach time and expects
it to *return* a transformer — handing it an already-built transformer
instead meant unified invoked it immediately with no `tree` argument,
so `tree` was `undefined` and `node.children` threw on literally the
first render of any non-empty message. In dev that shows as Next's
error overlay; in the packaged production build (no dev overlay to
catch it) the same uncaught exception is what WKWebView was surfacing
as "This page couldn't load." Fixed by passing the tuple form instead —
`[remarkMentions, agents]` — so unified calls `remarkMentions(agents)`
itself and gets the transformer back correctly. The `.glassShell` change
stays (still reasonable defensively), it just wasn't the actual bug.
