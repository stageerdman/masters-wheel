# Update v1 — Agents

## Goal
Add a new "Agents" view (like ChatGPT's custom GPTs): create and edit your
own agents — photo, name, @nickname, description, instructions, and
knowledge files — reachable from the Main Menu. Includes a context-usage
meter, Save/dirty-state, a Version History side panel, and session-level
Cmd+Z/Cmd+Shift+Z undo-redo on in-progress edits.

## Spec, as dictated
- New Main Menu item: "Agents", navigates to its own page.
- Left column: every created agent, like Performance Review's navigation
  column. "Add new agent" always sits at the top, styled almost identically
  to a normal agent row except a `+` instead of a photo.
- Selecting an agent (or creating one) shows its editor on the right:
  photo (changeable), name, nickname (rendered as `@nickname`, defaults to
  the lowercased/no-spaces version of the name), description, instructions,
  and knowledge-file management.
- Instructions can `@`-reference a knowledge file by name.
- A context-usage indicator shows 0–100% of how much knowledge content is
  "uploaded" (fake budget — no backend).
- Top-right: a Save button (only relevant once something's unsaved) and a
  Version History button that opens a right-side panel to browse/restore
  any past version.
- Cmd+Z / Cmd+Shift+Z undo/redo in-progress edits, field by field, even
  before anything is ever saved.

Confirmed with the user before starting: this is NOT required to share the
AI Assistant's existing, unrelated `Agent` roster (chat @mentions/sidebar)
— a separate concept is fine. Everything here is fake/local data, no
backend, no real persistence across reloads (matches the rest of the app).

## UX decisions (from 3 parallel UX-thinking passes, synthesized)
- **Nickname lock**: auto-derives from Name (lowercase, strip all
  whitespace) on every keystroke until the user types directly into the
  nickname field with a value that differs from the auto-derived one — then
  it locks. Clearing the nickname field back to empty unlocks it again.
- **Undo/redo vs. Save**: Save is a hard wall — committing a version also
  clears the undo stack. Restoring an old version is itself one single
  undo-able commit (one Cmd+Z after a restore snaps back to what was live
  a moment before). The stack is per-agent, in-memory, reset whenever the
  selection changes (achieved by remounting the editor via `key={agent.id}`).
- **Commit granularity**: text fields (name/nickname/description/
  instructions) commit to the undo stack on blur, only if changed — native
  per-field undo keeps working untouched while a field is focused. Non-text
  actions (photo change, knowledge file add/remove) commit immediately.
  The app-level Cmd+Z/Cmd+Shift+Z listener only acts while focus is
  *outside* any text-editable control, so it never fights native undo.
- **Mention picker generalized**: `useMentionPicker` (previously private to
  the AI Assistant's `Composer`) moves to `src/lib/useMentionPicker.ts`,
  generic over `{ name: string }`, since it's now needed by two unrelated
  features. Agents still match by `startsWith`; Instructions matches
  knowledge files by substring (filenames are recalled by any word, not
  just the start).
- **Mention rendering**: plain text while the Instructions textarea is
  focused (matches how the chat Composer behaves while typing); a styled
  accent tag once blurred (matches how a sent chat Message renders a
  mention) — a stale reference to a deleted file just quietly reverts to
  plain text, no extra "broken reference" UI.
- **Version History panel**: reuses the AI Assistant's `Sidebar` push-split
  mechanic (a real flex-width split that narrows the editor, not a modal —
  a modal would hide the very content you're comparing against), with a
  full-width drawer takeover below a narrow container width, same as
  `Sidebar`.
- **Context meter**: fixed fake byte cap; percentage = sum of fake file
  sizes over the cap, clamped to 100% for display. Stays inside the
  existing 5-color budget — no red/amber "danger" colors added; "full" is
  communicated through copy, not a new token.

## Roadmap

### Phase 1 — Generalize the @mention picker
- [ ] Move `findActiveMention`/`useMentionPicker` out of
      `AIAssistant/.../Composer/Composer.script.ts` into
      `src/lib/useMentionPicker.ts`, generic over `{ name: string }`, with
      an optional custom match predicate (default: `startsWith`).
- [ ] Update `Composer.tsx` to import the shared hook directly; delete
      `Composer.script.ts` once nothing of it remains.
- [ ] `npm run build` / `lint` / `tsc --noEmit` clean; AI Assistant's
      existing @mention behavior unchanged (verified by reasoning through
      the diff — no connected browser this session).

### Phase 2 — Route + Main Menu wiring
- [ ] New route `src/app/agents/page.tsx` hosting a new `Agents` root
      element (wrapped in `Canvas`, matching `performance-review/page.tsx`).
- [ ] Add "Agents" to `MainMenu`'s `MENU_ITEMS`; activating it
      `router.push("/agents")`.

### Phase 3 — Data model + root element
- [ ] `src/elements/Agents/Agents.data.ts`: `CoachAgent`, `KnowledgeFile`,
      `AgentVersion` types + a few fake seed agents (one with knowledge
      files + an instructions string that @-references one of them, so the
      mention-rendering path has something real to show immediately).
- [ ] `src/elements/Agents/Agents.tsx`: owns the saved roster, selected id,
      and `versionsByAgent` (lifted above the editor so version history
      survives switching agents, per the UX spec). Composes `AgentNav` +
      `AgentEditor`.

### Phase 4 — Roster column
- [ ] `children/AgentNav/AgentNav.tsx` + `children/AgentNavItem/`: the
      scrollable list, "Add new agent" row always first (same component,
      `agent` prop optional — renders the `+`/dashed-avatar look when
      absent), active-row highlight matching `VideoListItem`'s convention.
- [ ] Empty-roster and draft-agent (untitled, no photo) states.

### Phase 5 — Editor shell + identity header
- [ ] `children/AgentEditor/AgentEditor.tsx` + `.script.ts`: draft field
      state (seeded from the selected agent, remounted via `key={agent.id}`
      so switching agents always starts clean), dirty detection against the
      saved snapshot.
- [ ] `children/IdentityHeader/`: photo (hidden file input +
      `URL.createObjectURL` preview, no persistence), Name, `@Nickname`
      (auto-derive/lock rule above), Description — all inline-editable,
      no separate "edit mode."
- [ ] No-agent-selected empty state in the editor panel.

### Phase 6 — Instructions + knowledge-file mentions
- [ ] `children/InstructionsField/`: textarea using the shared mention
      hook against the draft's knowledge files (substring match); blurred
      state renders `@Name` mentions as styled tags (reusing the accent-tag
      look, not literally importing another element's CSS module).
- [ ] Zero-knowledge-files hint when `@` is typed with nothing to suggest.

### Phase 7 — Knowledge files + context meter
- [ ] `children/KnowledgeManager/`: drop-zone-doubles-as-empty-state, file
      list (icon by type, name, size, remove button) once ≥1 file exists,
      plus a persistent "+ Add file" row.
- [ ] Context meter (bar + %, fixed fake cap, clamped display at 100%).
- [ ] Removing a file leaves any `@mention` of it in Instructions dangling
      (reverts to plain text on next blurred render) — no warning dialog,
      per the UX spec's reasoning.

### Phase 8 — Save / Version History / Undo-redo
- [ ] `children/SaveButton/`: reserved layout slot, fades in only while
      dirty, brief "Saved" confirmation, aborts back to dirty if a new edit
      lands mid-confirmation.
- [ ] `children/VersionHistoryPanel/` + `children/VersionRow/`: push-split
      panel (reusing `Sidebar`'s mechanic/breakpoint), newest-first list,
      diff-computed change labels, "Current" badge, confirm-before-restore
      only when there are unsaved edits to discard.
- [ ] Undo/redo stack + blur-commit logic + the scoped global
      Cmd+Z/Cmd+Shift+Z handler, all in `AgentEditor.script.ts`.

### Phase 9 — Verify + document
- [ ] `npm run build` / `lint` / `tsc --noEmit` clean; SSR HTML check via
      `curl` on `/agents`.
- [ ] Update `FEATURES.md` with an Agents section.
- [ ] **Not verified**: live click-through (no connected browser this
      session, per the project's verification constraints) — ask the user
      to check keyboard/mouse interaction, drag-drop file add, and the
      Cmd+Z/Cmd+Shift+Z behavior themselves.

## Next
Not in scope for v1: wiring these agents into the AI Assistant's existing
roster/@mention system (explicitly deferred by the user — "don't even have
to be the same agents now"), any real file upload/storage, and real AI
behavior for a created agent.
