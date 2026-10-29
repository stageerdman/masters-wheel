# AI Assistant — wiki

Durable decisions and lessons from designing the AI assistant (icon →
pop-up chat window with 3 docked forms). Synthesized from 3 parallel
UX-research passes (icon/motion, drag-to-dock geometry, chat/history/
agent content) plus the orchestrator's resolution of each pass's open
questions.

## What the old bottom-left "N" actually was
Not custom code — it's Next.js's built-in dev-mode indicator badge,
controlled by `devIndicators` in `next.config.ts`. Turning it off there
(`devIndicators: false`) is the correct way to "drop whatever was there
before"; there was no element to delete.

## Why snap-to-3-states, not freeform dragging
The user's own framing ("several forms and positions it can take")
describes a finite state machine, not continuous placement. Freeform
would need persisted arbitrary coordinates and resize/collision handling
for no payoff — the content inside only has 3 valid shapes (single chat /
roomier single chat / chat+sidebar) regardless of exact pixel position.
The window still follows the cursor during the drag for feedback, but
always resolves to one of left/center/hybrid on release.

## Why no new color tokens for this feature
- Trigger icon + drop-zone affordance reuse `--color-accent` (at reduced
  opacity for the drop-zone band via an inline-style mix, same pattern as
  `--badge-color`/`--icon-color` instancing elsewhere in the app) — this is
  chrome, not a new category identity, so it belongs in the existing core-5
  budget.
- Agent avatars start **neutral** (a shared bordered circle + initial, no
  per-agent color) rather than a new `--color-agent-*` category palette.
  Reasoning: the bookmark/status category colors exist because each value
  *is* a real, dictated, distinct category. Agents here are still a mockup
  with no confirmed roster or identity system — adding colors now would be
  deciding a category ad hoc. Revisit this the moment real, named agents
  with real distinct identities get dictated as a feature.

## Drag handle = the window's header
The header bar is the only region guaranteed to exist across all 3 states
(chat content changes, header doesn't), and it already needs to host the
collapse (h-line) button — so header-as-drag-handle reuses one surface for
both jobs instead of adding a dedicated grip element.

## Styles/position split for `density`
`density: "compact" | "comfortable"` threads down from the dock controller
into `MessageList`/`Composer` as a prop, and only ever toggles
`.position.module.css` classes (padding/spacing/line-length) — never
`.styles.module.css` classes (color/type). This keeps the convention's
styles-vs-position boundary intact even though the same prop affects both
"look and feel" conversationally.

## Explicit `density` prop over ResizeObserver/container queries
Matches CLAUDE.md's rule that a parent is responsible for its children's
positioning — the dock controller already knows which of the 3 states is
active, so it should just tell its children, rather than have each child
independently re-derive the same fact from its own measured width.

## Drag-to-dock implementation notes
- The window is positioned absolutely within a full-viewport fixed
  `AIAssistant` root (`position: fixed; inset: 0; pointer-events: none;`);
  the trigger, window, and drop-zone bands each opt back into
  `pointer-events: auto` individually so the rest of the page stays
  clickable everywhere else.
- Every dock geometry (`enter`/`dockLeft`/`dockCenter`/`dockHybrid`) sets
  `left`/`top`/`width`/`height`/`transform` explicitly — never `bottom`,
  never an implicit value — specifically so every transition between them
  has a concrete start and end to animate across (mixing `bottom` with
  `top`, or leaving a property unset in some states, made Chrome snap
  instead of animate on dock changes).
- `transform` on each dock class composes a fixed centering offset with a
  live `translate(var(--drag-x, 0px), var(--drag-y, 0px))` — set only via
  inline style while dragging — so cursor-follow never has to fight the
  dock class for the whole `transform` property. No ref/`getBoundingClientRect`
  needed for this: the drag offset is just `pointer - pointerdownStart`.
- Because `transition` is a single shorthand per selector, exactly one
  file may declare it for a given selector or the other's properties get
  silently dropped. `AIAssistantWindow.position.module.css` owns the
  entire `transition` declaration (including `opacity`, even though
  opacity's *values* live in `.styles.module.css`) — this is the pattern
  to repeat if a future element needs to transition properties split
  across both files.
- Drag is disabled below 640px viewport width (`DRAG_DISABLED_BELOW_PX` in
  `AIAssistant.script.ts`); below that breakpoint the left dock becomes
  near-full-bleed via a plain CSS media query in the same position module.

## Sessions double as the agent model
Rather than inventing a separate "agent chat" concept, clicking an agent
in the roster creates (or reuses) an ordinary `ChatSession` tagged with
`agentId`, titled "Chat with {name}" — it shows up in `HistoryList` like
any other session. This gave the two described agent interactions (click
to open a dedicated chat vs. drag onto the current chat to add it
alongside) a single underlying data model instead of two: `ChatSession`
for the former, `activeAgentIds` on whichever session is current for the
latter.

## Canned history vs. a faked live reply
`HISTORY_FIXTURES` in `AIAssistantWindow.data.ts` includes a couple of
pre-written `assistant`-role lines inside each fake past session. This is
different from the "no fake AI reply" decision above: it's static
placeholder *history* (same honest fakery as `PerformanceReview`'s fake
transcript lines), not a live simulated response to something the user
just typed. It's also what first exercises the assistant-message visual
style, which otherwise nothing in v1 would ever render.

## Agent-roster drag uses native HTML5 drag-and-drop, not pointer events
Unlike the window-dock drag (which needs 1:1 cursor-follow and 3-zone
resolution — custom pointer-event tracking earns its keep there), dragging
a roster card onto the chat column is a plain "pick up a list item, drop
it on a target" gesture with no custom visuals needed beyond a drop-target
highlight. `draggable` + `onDragStart`/`onDragOver`/`onDrop` covers that
natively with far less code than reimplementing it on pointer events, and
isn't the external "drag-and-drop library" CLAUDE.md's conventions are
steering away from — it's a bare browser API, same tier as pointer events.

## v2: ghost-accurate drag preview, flush-bottom geometry, manual resize
Follow-up fix after the first pass: the drop-zone overlay was 3 generic
full-height bands that didn't match where the window would actually land
— confusing. Fixed by centralizing every dock size as a `--dock-*` custom
property on `AIAssistant.position.module.css`'s `.root` (inherited by any
descendant), so both the real window's dock classes and
`DockZoneOverlay`'s ghost-box previews read the exact same numbers. The
overlay now renders 3 actual-shaped/positioned ghost rectangles instead
of bands, with the targeted one highlighted more strongly.

Geometry also changed: all 3 docks are now bottom-flush (no gap — only
the collapsed "enter"/trigger-anchor point keeps a `--dock-gap` inset),
and only the top corners are rounded (`border-radius: 0.75rem 0.75rem 0
0`) since the bottom edge touches the viewport edge. Hybrid and center
are no longer vertically centered — all 3 states anchor to the bottom,
differing only in horizontal placement/size: left and hybrid share the
same left edge (hybrid is just bigger), center is the same size as hybrid
but horizontally centered. Center's width/height literally alias
hybrid's via `var(--dock-hybrid-w/h)` so bumping hybrid's size later
(mentioned as a future intent) moves both together without edits in two
places.

Added manual resize: a small top-right corner hit-area
(`AIAssistantWindow`'s `.resizeHandle`) lets the user drag-resize whatever
dock is currently active. This writes a `manualSize` override that takes
precedence over the dock class's width/height/top via inline style (top
is re-derived from the new height so the bottom edge stays flush even
while manually resized). Redocking (releasing a header drag) always
clears `manualSize` — "drag it somewhere and it snaps back to the
predefined size" was explicit. A `.resizing` class (mirroring `.dragging`)
disables the eased `transition` while the resize pointer is down, same
reasoning as drag: per-frame inline updates must not be eased or they lag.

Centering a box via `left: 50%; transform: translate(-50%, 0)` is
convenient because the browser re-centers automatically on any width
change (no JS needed) — but that same property means a resize-by-edge
gesture in the centered (center) dock state moves *both* edges at once
rather than just the one being dragged. Documented rather than solved:
fixing it would mean abandoning the free auto-centering for that dock
state, which isn't worth it for a corner-resize affordance in a prototype.

## v3: Option/Alt freeform placement (persisted) + decoupled side menu
Two more follow-up asks.

**Option-modifier freeform placement.** Holding Option/Alt while starting
a header drag or a corner resize switches that specific gesture from
"snap to a preset" to "place/size it exactly where released," committing
a 4th `dockState`, `"custom"`, with an explicit `{ left, top, width,
height }` in pixels. This is intentionally a *per-gesture* modifier, not
a mode toggle — checked once via `event.altKey` at the gesture's
pointerdown, so a normal (non-Option) drag from a custom placement still
snaps back to the nearest preset exactly like it would from any other
dock state. The custom placement is written to `localStorage`
(`ai-assistant-custom-placement`) on release and read back on mount via
`useEffect` (not a lazy `useState` initializer, since `localStorage`
doesn't exist during SSR — reading it in the initializer would crash the
server render; reading it post-mount avoids a hydration mismatch at the
cost of a one-render flash from the default to the saved placement,
which is an accepted, ordinary tradeoff for this kind of hydration and
not the "cascading setState in an effect" anti-pattern the lint rule
generically warns about — hence the scoped disable comment around it).
Resizing while already in `"custom"` keeps the *left* edge and the
*bottom* edge fixed (mirrors the preset resize's bottom-anchored feel)
and grows from the top-right corner, same as the ephemeral preset
resize — the only difference is where the result gets stored and whether
it survives redocking.

**Side menu decoupled from dock state.** The history/agent sidebar used
to only exist in the hybrid dock (`dockState === "hybrid"`). It's now a
standalone toggle (`isSideMenuOpen`) controlled by a header button, valid
in any dock state — including the narrow left dock, where it's
necessarily cramped (180px of a ~340px window) but still functional,
since the ask was explicitly to decouple it. Implemented as a
`position: absolute` overlay that slides in via `transform: translateX`
over the chat column (which always keeps full width) rather than a flex
sibling that shares row space — "pop...over," not "push the chat aside."
The sidebar is always mounted (so the slide transition has something to
animate); nothing currently removes it from the tab order while visually
hidden off-screen, which is a known, deferred a11y gap alongside the
others below.

Header layout changed to accommodate this: the side-menu toggle moved to
the left, the collapse (h-line) button moved to the right, and both now
share one `.headerButton` class (previously `.collapseButton`, used by
only one button) since they're visually identical chrome.

## Deliberately deferred (not blocking v1)
- `dockState` persistence across reloads for the 3 presets (Option-placed
  "custom" placements persist via localStorage now; left/center/hybrid
  still always reset to left on reload).
- Keyboard-only path to cycle dock states or toggle the side menu
  (accessibility gap, needs an owner once the pointer-drag version is
  stable). The side menu's hidden-but-still-mounted overlay also isn't
  removed from the tab order while closed.
- Whether a dropped-in agent should ever produce fake reply text — no,
  for now; there's no multi-agent logic to simulate convincingly yet, so a
  system line + chip is the honest amount of fakery for UI-shell phase.
